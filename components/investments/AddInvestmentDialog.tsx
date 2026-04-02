'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { AssetType, InvestmentOperation } from '@/lib/types'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  acoes:               'Ações',
  fii:                 'FII',
  renda_fixa:          'Renda Fixa',
  fundo_investimento:  'Fundo',
  cripto:              'Cripto',
  dolar:               'Dólar',
}

const OPERATION_LABELS: Record<InvestmentOperation, string> = {
  C: 'Compra',
  V: 'Venda',
  D: 'Dividendo',
}

interface Row {
  id: string
  date: string
  ticker: string
  asset_type: AssetType
  operation: InvestmentOperation
  quantity: string
  unit_price: string
  total_value: string
}

function emptyRow(): Row {
  return {
    id:          crypto.randomUUID(),
    date:        new Date().toISOString().slice(0, 10),
    ticker:      '',
    asset_type:  'acoes',
    operation:   'C',
    quantity:    '',
    unit_price:  '',
    total_value: '',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function AddInvestmentDialog({ open, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [saving, setSaving] = useState(false)
  const [tickerMap, setTickerMap] = useState<Record<string, AssetType>>({})

  useEffect(() => {
    if (!open) return
    fetch('/api/investments/positions')
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, AssetType> = {}
        for (const p of (data.positions ?? []) as { ticker: string; asset_type: AssetType }[]) {
          map[p.ticker] = p.asset_type
        }
        setTickerMap(map)
      })
      .catch(() => {})
  }, [open])

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }

        // Auto-fill asset_type when ticker matches a known position
        if (field === 'ticker') {
          const knownType = tickerMap[value.toUpperCase()]
          if (knownType) updated.asset_type = knownType
        }

        // When switching to Dividendo, clear qty and price
        if (field === 'operation' && value === 'D') {
          updated.quantity = ''
          updated.unit_price = ''
          return updated
        }

        // Auto-calculate total when qty and price are both filled
        if (field === 'quantity' || field === 'unit_price') {
          const qty   = parseFloat(field === 'quantity'   ? value : r.quantity)
          const price = parseFloat(field === 'unit_price' ? value : r.unit_price)
          if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
            updated.total_value = (qty * price).toFixed(2)
          }
        }

        return updated
      })
    )
  }

  async function handleAssetTypeChange(id: string, value: string) {
    updateRow(id, 'asset_type', value)

    const priceEndpoints: Record<string, { url: string; key: string }> = {
      cripto: { url: '/api/crypto/price',    key: 'btc_brl' },
      dolar:  { url: '/api/market/usd-brl',  key: 'usd_brl' },
    }

    const endpoint = priceEndpoints[value]
    if (!endpoint) return

    try {
      const res = await fetch(endpoint.url)
      if (!res.ok) return
      const data = await res.json()
      const price: number = data[endpoint.key]
      if (!price) return

      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r
          const updated = { ...r, unit_price: price.toFixed(2) }
          const qty = parseFloat(r.quantity)
          if (!isNaN(qty) && qty > 0) {
            updated.total_value = (qty * price).toFixed(2)
          }
          return updated
        })
      )
    } catch {
      // silently ignore — user can fill manually
    }
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }

  const handleClose = useCallback(() => {
    setRows([emptyRow()])
    onClose()
  }, [onClose])

  async function handleSave() {
    // Validate
    for (const r of rows) {
      if (!r.date || !r.ticker.trim()) {
        toast.error('Preencha data e ticker em todas as linhas')
        return
      }
      const total = parseFloat(r.total_value)
      if (isNaN(total) || total <= 0) {
        toast.error(`Valor total inválido para ${r.ticker || 'linha sem ticker'}`)
        return
      }
    }

    setSaving(true)
    const transactions = rows.map((r) => ({
      date:        r.date,
      ticker:      r.ticker.trim().toUpperCase(),
      asset_type:  r.asset_type,
      operation:   r.operation,
      quantity:    r.quantity ? parseFloat(r.quantity) : undefined,
      unit_price:  r.unit_price ? parseFloat(r.unit_price) : undefined,
      total_value: parseFloat(r.total_value),
    }))

    const res = await fetch('/api/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    })
    setSaving(false)

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? 'Erro ao salvar transações')
      return
    }

    const data = await res.json()
    toast.success(`${data.imported} transaç${data.imported === 1 ? 'ão adicionada' : 'ões adicionadas'}`)
    onSaved()
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-[860px] max-w-[calc(100vw-2rem)] sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle>Adicionar transações manualmente</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto -mx-1 px-1">
        {/* Header row */}
        <div className="grid grid-cols-[120px_1fr_120px_110px_80px_100px_104px_28px] gap-2 px-1 min-w-[700px]">
          {['Data', 'Ticker', 'Tipo', 'Operação', 'Qtd', 'Preço unit.', 'Total (R$)', ''].map((h) => (
            <span key={h} className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {/* Scrollable rows — max 5 visible */}
        <div className="overflow-y-auto max-h-[200px] space-y-2 pr-1 min-w-[700px]">
          {rows.map((row) => {
            const isDividend = row.operation === 'D'
            return (
              <div
                key={row.id}
                className="grid grid-cols-[120px_1fr_120px_110px_80px_100px_104px_28px] gap-2 items-center"
              >
                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                  className="h-8 text-sm px-2"
                />

                <div className="relative">
                  <Input
                    list={`tickers-${row.id}`}
                    placeholder="PETR4"
                    value={row.ticker}
                    onChange={(e) => updateRow(row.id, 'ticker', e.target.value.toUpperCase())}
                    className="h-8 text-sm px-2 uppercase"
                  />
                  {Object.keys(tickerMap).length > 0 && (
                    <datalist id={`tickers-${row.id}`}>
                      {Object.keys(tickerMap).map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  )}
                </div>

                <Select
                  value={row.asset_type}
                  onValueChange={(v) => handleAssetTypeChange(row.id, v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={row.operation}
                  onValueChange={(v) => updateRow(row.id, 'operation', v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(OPERATION_LABELS) as [InvestmentOperation, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                  disabled={isDividend}
                  className="h-8 text-sm px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                />

                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0,00"
                  value={row.unit_price}
                  onChange={(e) => updateRow(row.id, 'unit_price', e.target.value)}
                  disabled={isDividend}
                  className="h-8 text-sm px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                />

                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0,00"
                  value={row.total_value}
                  onChange={(e) => updateRow(row.id, 'total_value', e.target.value)}
                  className="h-8 text-sm px-2"
                />

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="text-zinc-600 hover:text-red-400 disabled:opacity-20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
        </div>{/* end overflow-x-auto */}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRow}
          className="w-fit gap-1.5 text-zinc-400 hover:text-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Adicionar linha
        </Button>

        <DialogFooter className="pt-4 border-t border-zinc-800">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving
              ? 'Salvando...'
              : `Salvar ${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

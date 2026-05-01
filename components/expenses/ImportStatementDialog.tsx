'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, X, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseXpCreditCSV, xpRowToTransactionInput, type XpCreditRow } from '@/lib/xp-credit-parser'
import type { Category } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

type Bank = 'xp'

const BANK_LABELS: Record<Bank, string> = {
  xp: 'XP Investimentos',
}

interface RowState {
  row: XpCreditRow
  category: string
  skip: boolean
}

// Grid template: data | descrição | parcela | valor | categoria | ação
const COLS = 'grid-cols-[80px_1fr_68px_110px_170px_28px]'

export function ImportStatementDialog({ open, onClose, onImported }: Props) {
  const [bank, setBank]             = useState<Bank>('xp')
  const [rows, setRows]             = useState<RowState[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [importing, setImporting]   = useState(false)
  const [bulkCategory, setBulkCategory] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {})
  }, [open])

  function reset() {
    setRows([])
    setBulkCategory('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose() { reset(); onClose() }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = bank === 'xp' ? parseXpCreditCSV(text) : []
    if (parsed.length === 0) { toast.error('Nenhuma transação encontrada no arquivo'); return }
    setRows(parsed.map((row) => ({ row, category: '', skip: false })))
  }

  function applyBulkCategory(cat: string) {
    setBulkCategory(cat)
    setRows((prev) => prev.map((r) => ({ ...r, category: cat })))
  }

  function updateRow(idx: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function handleImport() {
    const toImport = rows.filter((r) => !r.skip && r.category)
    if (toImport.length === 0) { toast.error('Selecione uma categoria para pelo menos uma transação'); return }

    setImporting(true)
    let success = 0, failed = 0

    for (const { row, category } of toImport) {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xpRowToTransactionInput(row, category)),
      })
      if (res.ok) success++; else failed++
    }

    setImporting(false)
    failed === 0
      ? toast.success(`${success} transações importadas`)
      : toast.warning(`${success} importadas, ${failed} falharam`)

    handleClose()
    onImported()
  }

  const catOptions  = categories.filter((c) => c.type === 'expense')
  const activeRows  = rows.filter((r) => !r.skip)
  const canImport   = activeRows.some((r) => r.category)
  const missingCat  = activeRows.filter((r) => !r.category).length

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="!flex !flex-col gap-4 sm:max-w-[min(95vw,960px)] max-h-[90vh] p-6">
        <DialogHeader>
          <DialogTitle>Importar Extrato</DialogTitle>
        </DialogHeader>

        {/* Banco + arquivo */}
        <div className="flex gap-3">
          <div className="w-48 shrink-0">
            <label className="text-xs text-zinc-400 mb-1 block">Banco</label>
            <Select value={bank} onValueChange={(v) => { setBank(v as Bank); reset() }}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(BANK_LABELS) as Bank[]).map((b) => (
                  <SelectItem key={b} value={b}>{BANK_LABELS[b]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Arquivo CSV</label>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-sm gap-2"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Selecionar arquivo
            </Button>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 text-zinc-500 py-10">
            <Upload className="h-8 w-8 opacity-30" />
            <p className="text-sm">Selecione o arquivo CSV exportado do banco</p>
            <p className="text-xs opacity-60">XP: Fatura › Exportar CSV</p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            {/* Barra de controles */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 shrink-0">
                {activeRows.length} de {rows.length} transações
              </span>
              <Select value={bulkCategory} onValueChange={applyBulkCategory}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue placeholder="Aplicar categoria em todas..." />
                </SelectTrigger>
                <SelectContent>
                  {catOptions.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Header da lista */}
            <div className={`grid ${COLS} gap-x-2 px-3 py-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wide border-b border-zinc-800`}>
              <span>Data</span>
              <span>Descrição</span>
              <span className="text-center">Parcela</span>
              <span className="text-right">Valor</span>
              <span>Categoria</span>
              <span />
            </div>

            {/* Linhas com scroll apenas vertical */}
            <div className="overflow-y-auto flex-1 min-h-0 rounded-lg border border-zinc-800 divide-y divide-zinc-800/60">
              {rows.map((r, idx) => (
                <div
                  key={idx}
                  className={`grid ${COLS} gap-x-2 items-center px-3 py-1.5 text-xs transition-opacity ${r.skip ? 'opacity-30' : ''}`}
                >
                  <span className="font-mono text-zinc-400 whitespace-nowrap">
                    {r.row.date.slice(5).replace('-', '/')}
                  </span>

                  <span className="truncate text-zinc-200 min-w-0" title={r.row.description}>
                    {r.row.description}
                  </span>

                  <span className="text-center text-zinc-400">
                    {r.row.installment_current && r.row.installment_total
                      ? `${r.row.installment_current}/${r.row.installment_total}`
                      : '—'}
                  </span>

                  <span className="text-right font-mono text-red-400 whitespace-nowrap">
                    {r.row.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>

                  <div>
                    {!r.skip && (
                      <Select value={r.category} onValueChange={(v) => updateRow(idx, { category: v })}>
                        <SelectTrigger className="h-6 text-xs border-zinc-700 w-full">
                          <SelectValue placeholder="Categoria..." />
                        </SelectTrigger>
                        <SelectContent>
                          {catOptions.map((c) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <button
                    onClick={() => updateRow(idx, { skip: !r.skip })}
                    title={r.skip ? 'Incluir' : 'Ignorar'}
                    className="flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {r.skip ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Aviso categorias faltando */}
            {missingCat > 0 && (
              <div className="flex items-center gap-2 text-amber-400 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {missingCat} transações sem categoria — serão ignoradas na importação
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
              <Button size="sm" onClick={handleImport} disabled={importing || !canImport}>
                {importing
                  ? 'Importando...'
                  : `Importar ${activeRows.filter((r) => r.category).length} transações`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

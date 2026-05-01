'use client'

import { useState } from 'react'
import { Pencil, Check, X, Trash2, ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { formatBRL, formatPercent, privateBRL } from '@/lib/utils'
import { usePrivacy } from '@/lib/privacy-context'
import { ASSET_TYPE_LABELS, ASSET_TYPES } from '@/lib/constants'
import type { AssetType, RendaFixaSubtype } from '@/lib/types'

interface EnrichedPosition {
  id:            number
  ticker:        string
  asset_type:    AssetType
  quantity:      number
  avg_price:     number
  current_price: number | null
  current_value: number
  portfolio_pct: number
  subtype:       RendaFixaSubtype
}

interface Props {
  positions: EnrichedPosition[]
  total: number
  onRefresh: () => void
}

const SECTION_COLORS: Record<AssetType, string> = {
  acoes:              'text-violet-400 border-violet-800/50 bg-violet-950/20',
  fii:                'text-purple-400 border-purple-800/50 bg-purple-950/20',
  renda_fixa:         'text-blue-400 border-blue-800/50 bg-blue-950/20',
  fundo_investimento: 'text-sky-400 border-sky-800/50 bg-sky-950/20',
  cripto:             'text-amber-400 border-amber-800/50 bg-amber-950/20',
  dolar:              'text-green-400 border-green-800/50 bg-green-950/20',
}

const SUBTYPE_LABELS: Record<NonNullable<RendaFixaSubtype>, string> = {
  prefixado:  'Prefixado',
  pos_fixado: 'Pós-Fixado',
  inflacao:   'Inflação',
}

const SUBTYPE_COLORS: Record<NonNullable<RendaFixaSubtype>, string> = {
  prefixado:  'border-sky-700 bg-sky-900/30 text-sky-300',
  pos_fixado: 'border-teal-700 bg-teal-900/30 text-teal-300',
  inflacao:   'border-orange-700 bg-orange-900/30 text-orange-300',
}

const ASSET_ORDER: AssetType[] = ['acoes', 'fii', 'renda_fixa', 'fundo_investimento', 'cripto', 'dolar']
const SUBTYPES: NonNullable<RendaFixaSubtype>[] = ['prefixado', 'pos_fixado', 'inflacao']

async function patchPosition(id: number, payload: Record<string, unknown>) {
  return fetch(`/api/investments/positions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function PositionsTable({ positions, total, onRefresh }: Props) {
  const { hidden } = usePrivacy()
  // Individual edit
  const [editingId,     setEditingId]     = useState<number | null>(null)
  const [draftTicker,   setDraftTicker]   = useState('')
  const [draftType,     setDraftType]     = useState<AssetType>('acoes')
  const [draftSubtype,  setDraftSubtype]  = useState<RendaFixaSubtype>(null)
  const [draftQty,      setDraftQty]      = useState('')
  const [draftAvgPrice, setDraftAvgPrice] = useState('')
  const [draftTotal,    setDraftTotal]    = useState('')
  const [deletingId,    setDeletingId]    = useState<number | null>(null)

  // Collapsed groups
  const [collapsed, setCollapsed] = useState<Set<AssetType>>(new Set())

  function toggleCollapse(type: AssetType) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  // Bulk selection
  const [selected,      setSelected]      = useState<Set<number>>(new Set())
  const [bulkType,      setBulkType]      = useState<AssetType>('acoes')
  const [bulkSubtype,   setBulkSubtype]   = useState<RendaFixaSubtype>(null)
  const [applying,      setApplying]      = useState(false)
  const [bulkDeleting,  setBulkDeleting]  = useState(false)

  if (!positions.length) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm rounded-lg border border-zinc-800">
        Nenhuma posição. Faça o upload do extrato XP.
      </div>
    )
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectGroup(ids: number[], allSelected: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  async function applyBulk() {
    setApplying(true)
    const results = await Promise.all(
      [...selected].map((id) => patchPosition(id, {
        asset_type: bulkType,
        subtype: bulkType === 'renda_fixa' ? bulkSubtype : null,
      }))
    )
    setApplying(false)
    const failed = results.filter((r) => !r.ok).length
    if (failed) toast.error(`${failed} item(s) falharam`)
    else toast.success(`${selected.size} posições atualizadas`)
    setSelected(new Set())
    onRefresh()
  }

  async function saveEdit(id: number) {
    const payload: Record<string, unknown> = {
      asset_type: draftType,
      subtype: draftType === 'renda_fixa' ? draftSubtype : null,
    }
    if (draftTicker.trim()) payload.ticker = draftTicker

    const qty   = draftQty !== ''      ? parseFloat(draftQty)      : null
    const price = draftAvgPrice !== '' ? parseFloat(draftAvgPrice) : null
    const total = draftTotal !== ''    ? parseFloat(draftTotal)     : null

    if (total !== null && !isNaN(total)) {
      const baseQty = qty && qty > 0 ? qty : 1
      payload.quantity  = baseQty
      payload.avg_price = total / baseQty
    } else {
      if (qty !== null)   payload.quantity  = qty
      if (price !== null) payload.avg_price = price
    }

    const res = await patchPosition(id, payload)
    if (res.ok) {
      toast.success('Tipo atualizado')
      setEditingId(null)
      onRefresh()
    } else {
      toast.error('Erro ao atualizar')
    }
  }

  async function deletePosition(id: number) {
    setDeletingId(id)
    const res = await fetch(`/api/investments/positions/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      toast.success('Posição removida')
      onRefresh()
    } else {
      toast.error('Erro ao remover posição')
    }
  }

  async function bulkDelete() {
    setBulkDeleting(true)
    const results = await Promise.all(
      [...selected].map((id) => fetch(`/api/investments/positions/${id}`, { method: 'DELETE' }))
    )
    setBulkDeleting(false)
    const failed = results.filter((r) => !r.ok).length
    if (failed) toast.error(`${failed} item(s) falharam`)
    else toast.success(`${selected.size} posições removidas`)
    setSelected(new Set())
    onRefresh()
  }

  const grouped = ASSET_ORDER.reduce<Record<AssetType, EnrichedPosition[]>>(
    (acc, type) => { acc[type] = positions.filter((p) => p.asset_type === type); return acc },
    { acoes: [], fii: [], renda_fixa: [], fundo_investimento: [], cripto: [], dolar: [] }
  )

  const activeTypes = ASSET_ORDER.filter((type) => grouped[type].length > 0)
  const allCollapsed = activeTypes.every((type) => collapsed.has(type))

  function toggleAll() {
    setCollapsed(allCollapsed ? new Set() : new Set(activeTypes))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={toggleAll}
          title={allCollapsed ? 'Expandir todos' : 'Recolher todos'}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {allCollapsed ? 'Expandir todos' : 'Recolher todos'}
        </button>
      </div>

      {ASSET_ORDER.filter((type) => grouped[type].length > 0).map((type) => {
        const group = grouped[type]
        const groupIds = group.map((p) => p.id)
        const groupTotal = group.reduce((s, p) => s + p.current_value, 0)
        const allGroupSelected = groupIds.every((id) => selected.has(id))
        const someGroupSelected = groupIds.some((id) => selected.has(id))
        const colors = SECTION_COLORS[type]

        const isCollapsed = collapsed.has(type)

        return (
          <div key={type} className={`rounded-lg border overflow-hidden ${colors}`}>
            {/* Section header */}
            <div className={`flex items-center justify-between px-4 py-2 ${!isCollapsed ? 'border-b' : ''} ${colors}`}>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allGroupSelected}
                  data-state={someGroupSelected && !allGroupSelected ? 'indeterminate' : undefined}
                  onCheckedChange={() => toggleSelectGroup(groupIds, allGroupSelected)}
                  className="border-current"
                />
                <button
                  onClick={() => toggleCollapse(type)}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left"
                >
                  {isCollapsed
                    ? <ChevronRight className="h-3.5 w-3.5 opacity-60 shrink-0" />
                    : <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
                  }
                  <span className="text-xs font-bold uppercase tracking-wider text-left">
                    {ASSET_TYPE_LABELS[type]}
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden md:inline text-xs font-mono opacity-70">{group.length}</span>
                <span className="text-sm font-mono font-semibold">{privateBRL(groupTotal, hidden)}</span>
                <span className="text-xs font-mono opacity-60">
                  {total > 0 ? formatPercent(groupTotal / total * 100) : '—'}
                </span>
              </div>
            </div>

            {!isCollapsed && <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="w-8" />
                  <TableHead className="text-zinc-500 text-xs">Ativo</TableHead>
                  <TableHead className="text-zinc-500 text-xs">
                    {type === 'renda_fixa' ? 'Subtipo' : 'Tipo'}
                  </TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Qtd</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">P. Médio</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">Total</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">% Carteira</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.map((pos) => {
                  const isEditing = editingId === pos.id
                  const isSelected = selected.has(pos.id)
                  return (
                    <TableRow
                      key={pos.ticker}
                      className={`border-zinc-800/30 hover:bg-white/[0.02] group/row transition-colors ${isSelected ? 'bg-white/[0.04]' : ''}`}
                    >
                      <TableCell className="w-8 pl-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(pos.id)}
                          className="border-current"
                        />
                      </TableCell>

                      <TableCell className="font-mono font-semibold text-zinc-100 text-sm">
                        {isEditing ? (
                          <input
                            value={draftTicker}
                            onChange={(e) => setDraftTicker(e.target.value.toUpperCase())}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-100 outline-none uppercase"
                          />
                        ) : (
                          <span className="truncate max-w-[180px] block">{pos.ticker}</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={draftType}
                              onChange={(e) => { setDraftType(e.target.value as AssetType); setDraftSubtype(null) }}
                              className="text-xs bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 outline-none text-zinc-100"
                            >
                              {ASSET_TYPES.map((t) => (
                                <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
                              ))}
                            </select>
                            {draftType === 'renda_fixa' && (
                              <select
                                value={draftSubtype ?? ''}
                                onChange={(e) => setDraftSubtype((e.target.value || null) as RendaFixaSubtype)}
                                className="text-xs bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 outline-none text-zinc-100"
                              >
                                <option value="">— subtipo —</option>
                                {SUBTYPES.map((s) => (
                                  <option key={s} value={s}>{SUBTYPE_LABELS[s]}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : type === 'renda_fixa' && pos.subtype ? (
                          <span className={`rounded-full border px-2 py-px text-[10px] leading-none whitespace-nowrap ${SUBTYPE_COLORS[pos.subtype]}`}>
                            {SUBTYPE_LABELS[pos.subtype]}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right text-xs font-mono text-zinc-400">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={draftQty}
                            onChange={(e) => setDraftQty(e.target.value)}
                            className="w-20 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-100 outline-none text-right"
                          />
                        ) : (
                          pos.quantity % 1 === 0 ? pos.quantity.toFixed(0) : pos.quantity.toFixed(4)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-zinc-300">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={draftAvgPrice}
                            onChange={(e) => setDraftAvgPrice(e.target.value)}
                            className="w-24 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-100 outline-none text-right"
                          />
                        ) : (
                          privateBRL(pos.avg_price, hidden)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono font-semibold">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={draftTotal}
                            onChange={(e) => setDraftTotal(e.target.value)}
                            className="w-28 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-100 outline-none text-right"
                          />
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            {privateBRL(pos.current_value, hidden)}
                            {pos.current_price && pos.avg_price > 0 && (() => {
                              const pnl = (pos.current_price - pos.avg_price) / pos.avg_price * 100
                              const positive = pnl >= 0
                              return (
                                <span className={`text-[10px] font-mono font-normal ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {positive ? '+' : ''}{pnl.toFixed(2)}%
                                </span>
                              )
                            })()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="flex items-center justify-end gap-1">
                          <div
                            className="h-1.5 rounded-full bg-current opacity-40"
                            style={{ width: `${Math.min(pos.portfolio_pct, 100) * 0.8}px` }}
                          />
                          <span className="font-mono text-xs opacity-70">
                            {formatPercent(pos.portfolio_pct)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="w-16 pr-2">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => saveEdit(pos.id)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                              <Check size={13} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setEditingId(pos.id)
                                setDraftTicker(pos.ticker)
                                setDraftType(pos.asset_type)
                                setDraftSubtype(pos.subtype)
                                setDraftQty(String(pos.quantity))
                                setDraftAvgPrice(String(pos.avg_price))
                                setDraftTotal(String(pos.current_value))
                              }}
                              className="opacity-0 group-hover/row:opacity-40 hover:!opacity-80 transition-opacity"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => deletePosition(pos.id)}
                              disabled={deletingId === pos.id}
                              className="opacity-0 group-hover/row:opacity-40 hover:!opacity-80 text-red-400 transition-opacity disabled:opacity-30"
                            >
                              {deletingId === pos.id ? <X size={12} /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>}
          </div>
        )
      })}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-3 shadow-xl">
          <span className="text-sm text-zinc-300 font-medium shrink-0">
            {selected.size} {selected.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>

          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-zinc-500 shrink-0">Alterar para:</span>
            <select
              value={bulkType}
              onChange={(e) => { setBulkType(e.target.value as AssetType); setBulkSubtype(null) }}
              className="text-xs bg-zinc-800 border border-zinc-600 rounded px-2 py-1 outline-none text-zinc-100"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>
              ))}
            </select>
            {bulkType === 'renda_fixa' && (
              <select
                value={bulkSubtype ?? ''}
                onChange={(e) => setBulkSubtype((e.target.value || null) as RendaFixaSubtype)}
                className="text-xs bg-zinc-800 border border-zinc-600 rounded px-2 py-1 outline-none text-zinc-100"
              >
                <option value="">— subtipo —</option>
                {SUBTYPES.map((s) => (
                  <option key={s} value={s}>{SUBTYPE_LABELS[s]}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={applyBulk}
              disabled={applying || bulkDeleting}
              className="rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              {applying ? 'Aplicando...' : 'Aplicar'}
            </button>
            <button
              onClick={bulkDelete}
              disabled={applying || bulkDeleting}
              className="rounded-md bg-red-900 hover:bg-red-800 border border-red-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors"
            >
              {bulkDeleting ? 'Removendo...' : 'Remover'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md border border-zinc-600 hover:border-zinc-500 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

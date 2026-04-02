'use client'

import { useCallback, useEffect, useState } from 'react'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { formatBRL, monthLabel, privateBRL, HIDDEN_VALUE } from '@/lib/utils'
import { usePrivacy } from '@/lib/privacy-context'

interface DividendRow {
  month:      string
  ticker:     string
  asset_type: string
  amount:     number
}

interface ByMonth {
  month: string
  total: number
  items: DividendRow[]
}

interface TickerSummary {
  ticker:     string
  asset_type: string
  total:      number
}

export function ProventosCard() {
  const [years,         setYears]         = useState<string[]>([])
  const [selectedYear,  setSelectedYear]  = useState<string>('all')
  const [byMonth,       setByMonth]       = useState<ByMonth[]>([])
  const [dividends,     setDividends]     = useState<DividendRow[]>([])
  const [totalYear,     setTotalYear]     = useState(0)
  const [selectedMonth, setSelectedMonth] = useState<ByMonth | null>(null)
  const [loading,       setLoading]       = useState(true)
  const { hidden } = usePrivacy()
  const [detailOpen,    setDetailOpen]    = useState(false)
  const [confirmClear,  setConfirmClear]  = useState(false)
  const [detailView,    setDetailView]    = useState<'ativo' | 'mes'>('ativo')

  const fetchDividends = useCallback(async (year: string) => {
    setLoading(true)
    const res  = await fetch(`/api/investments/dividends?year=${year}`)
    const data = await res.json()
    setYears(data.years ?? [])
    setByMonth(data.by_month ?? [])
    setDividends(data.dividends ?? [])
    setTotalYear(data.total_year ?? 0)
    setSelectedMonth(null)
    setLoading(false)
  }, [])

  useEffect(() => { fetchDividends('all') }, [fetchDividends])

  function handleYearChange(year: string) {
    setSelectedYear(year)
    fetchDividends(year)
  }

  async function handleClearAll() {
    const res = await fetch('/api/investments/dividends', { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Erro ao limpar proventos')
      return
    }
    const data = await res.json()
    toast.success(`${data.deleted} provento${data.deleted === 1 ? '' : 's'} removido${data.deleted === 1 ? '' : 's'}`)
    setConfirmClear(false)
    setDetailOpen(false)
    fetchDividends(selectedYear)
  }

  // Aggregate dividends by ticker for the detail modal
  const byTicker: TickerSummary[] = Object.values(
    dividends.reduce<Record<string, TickerSummary>>((acc, row) => {
      if (!acc[row.ticker]) {
        acc[row.ticker] = { ticker: row.ticker, asset_type: row.asset_type, total: 0 }
      }
      acc[row.ticker].total += row.amount
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  const chartData = byMonth.map((m) => ({
    month:    monthLabel(m.month),
    key:      m.month,
    total:    parseFloat(m.total.toFixed(2)),
    items:    m.items,
    selected: selectedMonth?.month === m.month,
  }))

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Proventos</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold font-mono text-emerald-400">{privateBRL(totalYear, hidden)}</span>
            <button
              onClick={() => setDetailOpen(true)}
              className="text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Ver detalhamento por ativo"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Year selector */}
        <div className="flex gap-1 mb-3 flex-wrap">
          <button
            onClick={() => handleYearChange('all')}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              selectedYear === 'all'
                ? 'bg-emerald-800/60 text-emerald-300 border border-emerald-700'
                : 'text-zinc-500 hover:text-zinc-300 border border-zinc-800'
            }`}
          >
            Todos
          </button>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                selectedYear === y
                  ? 'bg-emerald-800/60 text-emerald-300 border border-emerald-700'
                  : 'text-zinc-500 hover:text-zinc-300 border border-zinc-800'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">Carregando...</div>
        ) : !byMonth.length ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">
            Nenhum provento registrado
          </div>
        ) : (
          <>
            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={240} className="mt-6">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                onClick={(e: any) => {
                  if (!e?.activePayload?.[0]) return
                  const payload = e.activePayload[0].payload
                  const found = byMonth.find((m) => m.month === payload.key) ?? null
                  setSelectedMonth((prev) => prev?.month === payload.key ? null : found)
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} width={36} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: 11 }}
                  itemStyle={{ color: '#34d399' }}
                  formatter={(val: unknown) => [hidden ? HIDDEN_VALUE : formatBRL(val as number), 'Proventos']}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="total" radius={[3, 3, 0, 0]} style={{ cursor: 'pointer' }}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.selected ? '#34d399' : '#10b981'}
                      opacity={selectedMonth && !entry.selected ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Month detail */}
            {selectedMonth && (
              <div className="mt-3 border-t border-zinc-800 pt-3 space-y-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-zinc-300">
                    {monthLabel(selectedMonth.month)}
                  </span>
                  <span className="text-xs font-mono font-semibold text-emerald-400">
                    {privateBRL(selectedMonth.total, hidden)}
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedMonth.items
                    .slice()
                    .sort((a, b) => b.amount - a.amount)
                    .map((item) => (
                      <div key={item.ticker} className="flex items-center justify-between">
                        <span className="text-xs font-mono text-zinc-300">{item.ticker}</span>
                        <span className="text-xs font-mono text-emerald-400">{privateBRL(item.amount, hidden)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={(v) => { setDetailOpen(v); if (!v) setConfirmClear(false) }}>
        <DialogContent className="w-[480px] max-w-[calc(100vw-2rem)] sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>Detalhamento de proventos</DialogTitle>
              {confirmClear ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-400">Limpar tudo?</span>
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors px-1"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                  title="Limpar todos os proventos"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </DialogHeader>

          {byTicker.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">Nenhum provento registrado</p>
          ) : (
            <div className="mt-2">
              {/* Toggle */}
              <div className="flex gap-1 mb-3">
                {(['ativo', 'mes'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setDetailView(v)}
                    className={`rounded px-3 py-1 text-xs transition-colors ${
                      detailView === v
                        ? 'bg-zinc-700 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    {v === 'ativo' ? 'Por ativo' : 'Por mês'}
                  </button>
                ))}
              </div>

              {detailView === 'ativo' ? (
                <>
                  <div className="grid grid-cols-[1fr_80px_110px] gap-2 px-1 mb-1">
                    {['Ativo', 'Tipo', 'Total recebido'].map((h) => (
                      <span key={h} className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</span>
                    ))}
                  </div>
                  <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                    {byTicker.map((row) => (
                      <div key={row.ticker} className="grid grid-cols-[1fr_80px_110px] gap-2 items-center py-1 border-b border-zinc-800/60 last:border-0">
                        <span className="text-sm font-mono font-semibold text-zinc-200">{row.ticker}</span>
                        <span className="text-xs text-zinc-500 capitalize">{row.asset_type.replace('_', ' ')}</span>
                        <span className="text-sm font-mono text-emerald-400 text-right">{privateBRL(row.total, hidden)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {byMonth.map((m) => (
                    <div key={m.month}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-zinc-300">{monthLabel(m.month)}</span>
                        <span className="text-xs font-mono font-semibold text-emerald-400">{privateBRL(m.total, hidden)}</span>
                      </div>
                      <div className="space-y-1 pl-2 border-l border-zinc-800">
                        {m.items
                          .slice()
                          .sort((a, b) => b.amount - a.amount)
                          .map((item) => (
                            <div key={item.ticker} className="flex items-center justify-between">
                              <span className="text-xs font-mono text-zinc-400">{item.ticker}</span>
                              <span className="text-xs font-mono text-emerald-400">{privateBRL(item.amount, hidden)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer total */}
              <div className="grid grid-cols-[1fr_110px] gap-2 px-1 pt-2 mt-1 border-t border-zinc-700">
                <span className="text-xs font-semibold text-zinc-400">Total</span>
                <span className="text-sm font-mono font-bold text-emerald-400 text-right">
                  {privateBRL(byTicker.reduce((s, r) => s + r.total, 0), hidden)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

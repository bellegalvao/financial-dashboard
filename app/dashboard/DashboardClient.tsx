'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Wallet, PiggyBank, ArrowDownCircle, Plus, LineChart, X } from 'lucide-react'
import { PrivacyToggle } from '@/components/layout/PrivacyToggle'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { AllocationPieChart } from '@/components/investments/AllocationPieChart'
import { PatrimonioLineChart } from '@/components/investments/PatrimonioLineChart'
import { TransactionForm } from '@/components/expenses/TransactionForm'
import { AddInvestmentDialog } from '@/components/investments/AddInvestmentDialog'
import { Button } from '@/components/ui/button'
import { formatBRL, monthLabel } from '@/lib/utils'
import type { PatrimonioSnapshot } from '@/lib/types'

interface DashboardData {
  month:              string
  patrimonio_total:   number
  saldo_mes:          number
  total_investido_ano: number
  gastos_mes:         number
  receita_mes:        number
  allocation:         { acoes: number; fii: number; renda_fixa: number; fundo_investimento: number; cripto: number; dolar: number }
  snapshots:          PatrimonioSnapshot[]
}

const ASSET_LABELS: Record<string, string> = {
  acoes:              'Ações',
  fii:                'FII',
  renda_fixa:         'Renda Fixa',
  fundo_investimento: 'Fundos',
  cripto:             'Cripto',
  dolar:              'Dólar',
}

const ASSET_COLORS: Record<string, string> = {
  acoes:              'bg-blue-500',
  fii:                'bg-emerald-500',
  renda_fixa:         'bg-purple-500',
  fundo_investimento: 'bg-yellow-500',
  cripto:             'bg-orange-500',
  dolar:              'bg-cyan-500',
}

export function DashboardClient() {
  const [data,       setData]       = useState<DashboardData | null>(null)
  const [txFormOpen, setTxFormOpen] = useState(false)
  const [investOpen, setInvestOpen] = useState(false)
  const [fabOpen,    setFabOpen]    = useState(false)

  async function fetchData() {
    const res = await fetch('/api/dashboard')
    setData(await res.json())
  }

  useEffect(() => { fetchData() }, [])

  if (!data) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">Carregando...</div>
  }

  const totalAlloc = Object.values(data.allocation).reduce((s, v) => s + v, 0)

  const allocationMap = Object.fromEntries(
    Object.entries(data.allocation).map(([k, v]) => [
      k,
      { value: v, pct: totalAlloc > 0 ? (v / totalAlloc) * 100 : 0 },
    ])
  ) as Record<string, { value: number; pct: number }>

  const allocationEntries = Object.entries(data.allocation)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)

  return (
    <>
      <TransactionForm
        open={txFormOpen}
        onClose={() => setTxFormOpen(false)}
        onSaved={() => { setTxFormOpen(false); fetchData() }}
        month={data.month}
      />
      <AddInvestmentDialog
        open={investOpen}
        onClose={() => setInvestOpen(false)}
        onSaved={() => { setInvestOpen(false); fetchData() }}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-zinc-500 text-sm">Visão geral · {monthLabel(data.month)}</p>
          </div>
          <div className="flex items-center gap-2">
          <PrivacyToggle />
          {/* Desktop shortcut buttons — hidden on mobile (FAB handles it) */}
          <div className="hidden sm:flex gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setTxFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo gasto
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setInvestOpen(true)}>
              <LineChart className="h-4 w-4" />
              Novo ativo
            </Button>
          </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard label="Patrimônio total"  value={data.patrimonio_total}    icon={TrendingUp}      accent="purple" />
          <KpiCard label="Saldo do mês"      value={data.saldo_mes}           icon={Wallet}          accent="emerald" positive />
          <KpiCard label="Receita do mês"    value={data.receita_mes}         icon={PiggyBank}       accent="blue" />
          <KpiCard label="Gastos do mês"     value={data.gastos_mes}          icon={ArrowDownCircle} accent="red" />
        </div>

        {/* Charts + breakdown
            Mobile order:  Alocação → Patrimônio por classe → Evolução → Resumo
            Desktop order: Evolução(8col) | Alocação(4col) / Patr.classe(6col) | Resumo(6col)
        */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">

          {/* Alocação pie — mobile: 1st; desktop: row-1 right (col 9–12) */}
          <div className="order-1 lg:order-2 lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Alocação</h2>
            <AllocationPieChart allocation={allocationMap} total={totalAlloc} />
          </div>

          {/* Patrimônio por classe — mobile: 2nd; desktop: row-2 left */}
          {allocationEntries.length > 0 && (
            <div className="order-2 lg:order-3 lg:col-span-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                Patrimônio por classe
              </h2>
              <div className="space-y-3">
                {allocationEntries.map(([key, value]) => {
                  const pct = totalAlloc > 0 ? (value / totalAlloc) * 100 : 0
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-zinc-300">{ASSET_LABELS[key] ?? key}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">{pct.toFixed(1)}%</span>
                          <span className="text-sm font-mono font-semibold text-zinc-200 min-w-[100px] text-right">
                            {formatBRL(value)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800">
                        <div
                          className={`h-1.5 rounded-full ${ASSET_COLORS[key] ?? 'bg-zinc-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Total</span>
                  <span className="text-sm font-mono font-bold text-purple-400">{formatBRL(totalAlloc)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Evolução patrimônio — mobile: 3rd; desktop: row-1 left (col 1–8) */}
          {data.snapshots.length > 0 && (
            <div className="order-3 lg:order-1 lg:col-span-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Evolução do patrimônio
              </h2>
              <PatrimonioLineChart snapshots={data.snapshots} />
            </div>
          )}

          {/* Resumo mensal — mobile: 4th; desktop: row-2 right */}
          <div className={`order-4 lg:order-4 lg:col-span-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4`}>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Resumo · {monthLabel(data.month)}
            </h2>
            <div className="space-y-2">
              <SummaryRow label="Receita"          value={data.receita_mes}         positive />
              <SummaryRow label="Gastos"           value={-data.gastos_mes} />
              <SummaryRow label="Saldo"            value={data.saldo_mes}           positive bold />
              <SummaryRow label="Investido no ano" value={data.total_investido_ano} positive />
            </div>
          </div>
        </div>
      </div>

      {/* FAB — mobile only */}
      <div className="sm:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 -z-10"
              onClick={() => setFabOpen(false)}
            />
            <button
              onClick={() => { setFabOpen(false); setInvestOpen(true) }}
              className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-2.5 rounded-full shadow-xl text-sm font-medium"
            >
              <LineChart className="h-4 w-4 text-purple-400" />
              Novo ativo
            </button>
            <button
              onClick={() => { setFabOpen(false); setTxFormOpen(true) }}
              className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-2.5 rounded-full shadow-xl text-sm font-medium"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              Novo gasto
            </button>
          </>
        )}
        <button
          onClick={() => setFabOpen(f => !f)}
          className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-xl flex items-center justify-center transition-colors"
        >
          {fabOpen
            ? <X className="h-6 w-6" />
            : <Plus className="h-6 w-6" />
          }
        </button>
      </div>
    </>
  )
}

function SummaryRow({
  label,
  value,
  positive = false,
  bold = false,
}: {
  label:     string
  value:     number
  positive?: boolean
  bold?:     boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${bold ? 'p-2 rounded-lg bg-zinc-800/60' : 'py-1'}`}>
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={`text-sm font-mono font-semibold ${
        positive ? (value >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-red-400'
      }`}>
        {formatBRL(Math.abs(value))}
      </span>
    </div>
  )
}

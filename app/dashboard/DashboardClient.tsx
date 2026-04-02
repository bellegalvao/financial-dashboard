'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Wallet, PiggyBank, ArrowDownCircle, Plus, LineChart } from 'lucide-react'
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
  const [data,            setData]            = useState<DashboardData | null>(null)
  const [txFormOpen,      setTxFormOpen]      = useState(false)
  const [investOpen,      setInvestOpen]      = useState(false)

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

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-zinc-500 text-sm">Visão geral · {monthLabel(data.month)}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setTxFormOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo gasto</span>
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setInvestOpen(true)}>
              <LineChart className="h-4 w-4" />
              <span className="hidden sm:inline">Novo ativo</span>
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Patrimônio total"  value={data.patrimonio_total}   icon={TrendingUp}     accent="purple" />
          <KpiCard label="Saldo do mês"      value={data.saldo_mes}          icon={Wallet}         accent="emerald" positive />
          <KpiCard label="Receita do mês"    value={data.receita_mes}        icon={PiggyBank}      accent="blue" />
          <KpiCard label="Gastos do mês"     value={data.gastos_mes}         icon={ArrowDownCircle} accent="red" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-12 gap-4">

          {/* Patrimônio evolution */}
          {data.snapshots.length > 0 && (
            <div className="col-span-12 lg:col-span-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Evolução do patrimônio
              </h2>
              <PatrimonioLineChart snapshots={data.snapshots} />
            </div>
          )}

          {/* Allocation pie */}
          <div className={`col-span-12 ${data.snapshots.length > 0 ? 'lg:col-span-4' : 'lg:col-span-5'} rounded-xl border border-zinc-800 bg-zinc-900/50 p-4`}>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Alocação</h2>
            <AllocationPieChart allocation={allocationMap} total={totalAlloc} />
          </div>
        </div>

        {/* Bottom row: breakdown + summary */}
        <div className="grid grid-cols-12 gap-4">

          {/* Asset breakdown */}
          {allocationEntries.length > 0 && (
            <div className="col-span-12 md:col-span-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
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
                          <span className="text-sm font-mono font-semibold text-zinc-200 min-w-[110px] text-right">
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

          {/* Monthly summary */}
          <div className={`col-span-12 ${allocationEntries.length > 0 ? 'md:col-span-6' : 'md:col-span-8'} rounded-xl border border-zinc-800 bg-zinc-900/50 p-4`}>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Resumo · {monthLabel(data.month)}
            </h2>
            <div className="space-y-2">
              <SummaryRow label="Receita"           value={data.receita_mes}        positive />
              <SummaryRow label="Gastos"            value={-data.gastos_mes} />
              <SummaryRow label="Saldo"             value={data.saldo_mes}          positive bold />
              <SummaryRow label="Investido no ano"  value={data.total_investido_ano} positive />
            </div>
          </div>
        </div>
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
  label:    string
  value:    number
  positive?: boolean
  bold?:    boolean
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

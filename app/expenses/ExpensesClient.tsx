'use client'

import { useCallback, useEffect, useState } from 'react'
import { MonthPicker } from '@/components/layout/MonthPicker'
import { TransactionTable } from '@/components/expenses/TransactionTable'
import { MonthlySummaryChecklist } from '@/components/expenses/MonthlySummaryChecklist'
import { MonthlyKpiPanel } from '@/components/expenses/MonthlyKpiPanel'
import { CategoryBreakdownChart } from '@/components/expenses/CategoryBreakdownChart'
import { currentMonthKey } from '@/lib/utils'
import type { Transaction, MonthlySummary, ChecklistSection } from '@/lib/types'

interface Props {
  month: string
}

export function ExpensesClient({ month }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txRes, sumRes] = await Promise.all([
      fetch(`/api/transactions?month=${month}`),
      fetch(`/api/monthly-summary?month=${month}`),
    ])
    const txData  = await txRes.json()
    const sumData = await sumRes.json()
    setTransactions(txData)
    setSummary(sumData)
    setLoading(false)
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleChecklistToggle(id: number, checked: boolean) {
    await fetch('/api/monthly-summary/checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, checked }),
    })
    fetchData()
  }

  async function handleChecklistValueChange(id: number, value: number | null) {
    await fetch('/api/monthly-summary/checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, expected_value: value }),
    })
    fetchData()
  }

  async function handleChecklistNameChange(id: number, name: string) {
    await fetch('/api/monthly-summary/checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, item_name: name }),
    })
    fetchData()
  }

  async function handleChecklistAddItem(section: ChecklistSection): Promise<number> {
    const res = await fetch('/api/monthly-summary/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, section, item_name: 'Novo item' }),
    })
    const created = await res.json()
    await fetchData()
    return created.id
  }

  async function handleChecklistDeleteItem(id: number) {
    await fetch('/api/monthly-summary/checklist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchData()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Controle de Gastos</h1>
          <p className="text-zinc-500 text-sm">Gerencie suas receitas e despesas mensais</p>
        </div>
        <MonthPicker value={month} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-zinc-500">Carregando...</div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Transações — 6 colunas */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Lançamentos</h2>
            <TransactionTable
              transactions={transactions}
              month={month}
              onRefresh={fetchData}
            />
          </div>

          {/* Checklist — 2 colunas */}
          <div className="col-span-12 lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Checklist</h2>
            {summary && (
              <MonthlySummaryChecklist
                items={summary.checklist}
                onToggle={handleChecklistToggle}
                onValueChange={handleChecklistValueChange}
                onNameChange={handleChecklistNameChange}
                onAddItem={handleChecklistAddItem}
                onDeleteItem={handleChecklistDeleteItem}
              />
            )}
          </div>

          {/* KPIs + Categorias — 4 colunas */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Resumo</h2>
            {summary && <MonthlyKpiPanel summary={summary} />}

            {summary && summary.category_breakdown.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Gastos por Categoria
                </h3>
                <CategoryBreakdownChart data={summary.category_breakdown} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

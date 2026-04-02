'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { MonthPicker } from '@/components/layout/MonthPicker'
import { TransactionTable } from '@/components/expenses/TransactionTable'
import { MonthlySummaryChecklist } from '@/components/expenses/MonthlySummaryChecklist'
import { MonthlyKpiPanel } from '@/components/expenses/MonthlyKpiPanel'
import { CategoryBreakdownChart } from '@/components/expenses/CategoryBreakdownChart'
import { TransactionForm } from '@/components/expenses/TransactionForm'
import type { Transaction, MonthlySummary, ChecklistSection } from '@/lib/types'

interface Props {
  month: string
}

export function ExpensesClient({ month }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary,      setSummary]      = useState<MonthlySummary | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [fabOpen,      setFabOpen]      = useState(false)
  const [formOpen,     setFormOpen]     = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txRes, sumRes] = await Promise.all([
      fetch(`/api/transactions?month=${month}`),
      fetch(`/api/monthly-summary?month=${month}`),
    ])
    setTransactions(await txRes.json())
    setSummary(await sumRes.json())
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
    <>
      {/* FAB — mobile only */}
      <div className="sm:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setFabOpen(false)}
          />
        )}
        {fabOpen && (
          <button
            onClick={() => { setFabOpen(false); setFormOpen(true) }}
            className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-100 px-4 py-2.5 rounded-full shadow-xl text-sm font-medium"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            Novo lançamento
          </button>
        )}
        <button
          onClick={() => setFabOpen(f => !f)}
          className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-xl flex items-center justify-center transition-colors"
        >
          {fabOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {/* TransactionForm para o FAB mobile */}
      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); fetchData() }}
        month={month}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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
          /*
            Mobile order:  Resumo → Checklist → Lançamentos
            Desktop order: Lançamentos(6col) | Checklist(2col) | Resumo(4col)
          */
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">

            {/* Resumo — mobile: 1st; desktop: col 9–12 */}
            <div className="order-1 lg:order-3 lg:col-span-4 space-y-4">
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

            {/* Checklist — mobile: 2nd; desktop: col 7–8 */}
            <div className="order-2 lg:order-2 lg:col-span-2 space-y-4">
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

            {/* Lançamentos — mobile: 3rd; desktop: col 1–6 */}
            <div className="order-3 lg:order-1 lg:col-span-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Lançamentos</h2>
              <TransactionTable
                transactions={transactions}
                month={month}
                onRefresh={fetchData}
              />
            </div>

          </div>
        )}
      </div>
    </>
  )
}

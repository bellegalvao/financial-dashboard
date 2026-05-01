'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { MonthPicker } from '@/components/layout/MonthPicker'
import { TransactionTable } from '@/components/expenses/TransactionTable'
import { MonthlySummaryChecklist } from '@/components/expenses/MonthlySummaryChecklist'
import { MonthlyKpiPanel, DiinheiroEmContaCard, EntradasCard, SaidasCard, BalancoCard } from '@/components/expenses/MonthlyKpiPanel'
import { CategoryBreakdownChart } from '@/components/expenses/CategoryBreakdownChart'
import { TransactionForm } from '@/components/expenses/TransactionForm'
import { CategoriesManager } from '@/components/expenses/CategoriesManager'
import { ImportStatementDialog } from '@/components/expenses/ImportStatementDialog'
import { PrivacyToggle } from '@/components/layout/PrivacyToggle'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { Transaction, MonthlySummary, ChecklistSection } from '@/lib/types'

interface Props {
  month: string
}

export function ExpensesClient({ month }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary,      setSummary]      = useState<MonthlySummary | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [formOpen,     setFormOpen]     = useState(false)
  const [importOpen,   setImportOpen]   = useState(false)
  const initializedRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (!initializedRef.current) setLoading(true)
    const [txRes, sumRes] = await Promise.all([
      fetch(`/api/transactions?month=${month}`),
      fetch(`/api/monthly-summary?month=${month}`),
    ])
    setTransactions(await txRes.json())
    setSummary(await sumRes.json())
    setLoading(false)
    initializedRef.current = true
  }, [month])

  useEffect(() => {
    initializedRef.current = false
    fetchData()
  }, [fetchData])

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
      <button
        onClick={() => setFormOpen(true)}
        className="sm:hidden fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-xl flex items-center justify-center transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      <TransactionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); fetchData() }}
        month={month}
      />

      <ImportStatementDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={fetchData}
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Controle de Gastos</h1>
            <p className="text-zinc-500 text-sm">Gerencie suas receitas e despesas mensais</p>
          </div>
          <div className="flex items-center gap-2">
            <PrivacyToggle />
            <MonthPicker value={month} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-zinc-500">Carregando...</div>
        ) : (
          <>
            {/* Mobile: stacked layout */}
            <div className="flex flex-col gap-4 sm:hidden">
              <div className="space-y-4">
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
              <div className="space-y-4">
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
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Lançamentos</h2>
                <TransactionTable
                  transactions={transactions}
                  month={month}
                  onRefresh={fetchData}
                  onImport={() => setImportOpen(true)}
                />
              </div>
            </div>

            {/* Desktop: tabs layout */}
            <Tabs defaultValue="resumo" className="hidden sm:flex">
              <TabsList className="mb-4">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                <TabsTrigger value="categorias">Categorias</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="space-y-4">
                {summary && (
                  <>
                    <DiinheiroEmContaCard value={summary.dinheiro_em_conta} />
                    <div className="grid grid-cols-3 gap-4">
                      <EntradasCard entradas={summary.entradas} />
                      <SaidasCard saidas={summary.saidas} />
                      <BalancoCard balanco={summary.balanco} />
                    </div>
                    {summary.category_breakdown.length > 0 && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                          Gastos por Categoria
                        </h3>
                        <CategoryBreakdownChart data={summary.category_breakdown} />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="checklist">
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
              </TabsContent>

              <TabsContent value="lancamentos">
                <TransactionTable
                  transactions={transactions}
                  month={month}
                  onRefresh={fetchData}
                  onImport={() => setImportOpen(true)}
                />
              </TabsContent>

              <TabsContent value="categorias">
                <CategoriesManager month={month} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  )
}

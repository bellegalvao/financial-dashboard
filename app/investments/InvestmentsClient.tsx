'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Upload, X } from 'lucide-react'
import { PrivacyToggle } from '@/components/layout/PrivacyToggle'
import { Button } from '@/components/ui/button'
import { AllocationPieChart } from '@/components/investments/AllocationPieChart'
import { PatrimonioLineChart } from '@/components/investments/PatrimonioLineChart'
import { PositionsTable } from '@/components/investments/PositionsTable'
import { ProventosCard } from '@/components/investments/ProventosCard'
import { AddInvestmentDialog } from '@/components/investments/AddInvestmentDialog'
import type { PatrimonioSnapshot, AssetType, RendaFixaSubtype } from '@/lib/types'

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

export function InvestmentsClient() {
  const [snapshots,  setSnapshots]  = useState<PatrimonioSnapshot[]>([])
  const [allocation, setAllocation] = useState<Record<string, { value: number; pct: number }>>({})
  const [total,      setTotal]      = useState(0)
  const [positions,  setPositions]  = useState<EnrichedPosition[]>([])
  const [loading,    setLoading]    = useState(true)
  const [addOpen,    setAddOpen]    = useState(false)
  const [fabOpen,    setFabOpen]    = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [invRes, posRes] = await Promise.all([
      fetch('/api/investments'),
      fetch('/api/investments/positions'),
    ])
    const invData = await invRes.json()
    const posData = await posRes.json()

    setSnapshots(invData.snapshots ?? [])
    setAllocation(invData.allocation ?? {})
    setTotal(invData.total ?? 0)
    setPositions(posData.positions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-zinc-500">Carregando...</div>
  }

  return (
    <>
    <AddInvestmentDialog
      open={addOpen}
      onClose={() => setAddOpen(false)}
      onSaved={fetchAll}
    />

    {/* FAB — mobile only */}
    <div className="sm:hidden fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
      {/* Sub-actions */}
      {fabOpen && (
        <>
          <div className="flex items-center gap-2">
            <span className="bg-zinc-800 text-zinc-100 text-xs font-medium px-2.5 py-1 rounded-full shadow">Importar Extrato</span>
            <Link
              href="/investments/upload"
              onClick={() => setFabOpen(false)}
              className="h-12 w-12 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white shadow-lg flex items-center justify-center transition-colors"
            >
              <Upload className="h-5 w-5" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-zinc-800 text-zinc-100 text-xs font-medium px-2.5 py-1 rounded-full shadow">Adicionar</span>
            <button
              onClick={() => { setFabOpen(false); setAddOpen(true) }}
              className="h-12 w-12 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white shadow-lg flex items-center justify-center transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
      {/* Main FAB */}
      <button
        onClick={() => setFabOpen(o => !o)}
        className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-xl flex items-center justify-center transition-all"
      >
        {fabOpen
          ? <X className="h-6 w-6" />
          : <Plus className="h-6 w-6" />
        }
      </button>
    </div>

    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Investimentos</h1>
          <p className="text-zinc-500 text-sm">Carteira e desempenho da sua conta XP</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PrivacyToggle />
        </div>
        <div className="hidden sm:flex gap-2 shrink-0">
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/investments/upload">
              <Upload className="h-4 w-4" />
              Importar Extrato
            </Link>
          </Button>
        </div>
      </div>

      {/* Top row: Alocação + Patrimônio + Proventos */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Alocação por tipo</h2>
          <AllocationPieChart allocation={allocation} total={total} />
        </div>

        <div className="col-span-12 md:col-span-5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Evolução do patrimônio</h2>
          <PatrimonioLineChart snapshots={snapshots} />
        </div>

        <div className="col-span-12 md:col-span-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <ProventosCard />
        </div>
      </div>

      {/* Posições */}
      <div className="space-y-3">
        <PositionsTable positions={positions} total={total} onRefresh={fetchAll} />
      </div>
    </div>
    </>
  )
}

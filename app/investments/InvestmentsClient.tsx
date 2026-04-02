'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
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
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Investimentos</h1>
          <p className="text-zinc-500 text-sm">Carteira e desempenho da sua conta XP</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/investments/upload">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar Extrato</span>
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
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Posições atuais</h2>
        <PositionsTable positions={positions} total={total} onRefresh={fetchAll} />
      </div>
    </div>
    </>
  )
}

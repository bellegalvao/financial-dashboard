'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts'
import { formatBRL } from '@/lib/utils'
import type { CategoryWithBudget } from '@/lib/types'

interface Props {
  data: CategoryWithBudget[]
}

export function CategoryBreakdownChart({ data }: Props) {
  const chartData = data
    .filter((c) => c.real > 0 || c.budget > 0)
    .map((c) => ({
      name:       c.name.length > 9 ? c.name.slice(0, 8) + '…' : c.name,
      'Gasto':    parseFloat(c.real.toFixed(2)),
      'Previsão': parseFloat(c.budget.toFixed(2)),
    }))

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        Nenhum dado de categoria disponível
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#a1a1aa' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#a1a1aa' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `R$${v}`}
          width={52}
        />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: 12 }}
          formatter={(val: unknown) => formatBRL(val as number)}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Previsão" fill="#3f3f46" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Gasto"    fill="#ef4444" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { formatBRL, monthLabel, privateBRL, HIDDEN_VALUE } from '@/lib/utils'
import { usePrivacy } from '@/lib/privacy-context'

interface DividendByMonth {
  month: string
  total: number
}

interface Props {
  byMonth: DividendByMonth[]
  totalYear: number
}

export function DividendsBarChart({ byMonth, totalYear }: Props) {
  const { hidden } = usePrivacy()
  if (!byMonth.length) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        Nenhum dividendo/rendimento registrado
      </div>
    )
  }

  const data = byMonth.map((m) => ({
    month: monthLabel(m.month),
    'Dividendos / Rendimentos': parseFloat(m.total.toFixed(2)),
  }))

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Total no ano</span>
        <span className="text-sm font-semibold text-emerald-400 font-mono">{privateBRL(totalYear, hidden)}</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#a1a1aa' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#a1a1aa' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => hidden ? '•••' : `R$${v}`}
            width={52}
          />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: 12 }}
            formatter={(val: unknown) => [hidden ? HIDDEN_VALUE : formatBRL(val as number), 'Dividendos']}
          />
          <Bar
            dataKey="Dividendos / Rendimentos"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

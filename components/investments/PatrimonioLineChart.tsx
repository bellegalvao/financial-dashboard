'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { formatBRL, monthLabel } from '@/lib/utils'
import type { PatrimonioSnapshot } from '@/lib/types'

interface Props {
  snapshots: PatrimonioSnapshot[]
}

export function PatrimonioLineChart({ snapshots }: Props) {
  if (!snapshots.length) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        Nenhum dado de evolução disponível
      </div>
    )
  }

  const data = snapshots.map((s) => ({
    month:      monthLabel(s.month),
    total:      s.total_value,
    acoes:      s.acoes_value,
    fii:        s.fii_value,
    renda_fixa: s.renda_fixa_value,
    cripto:     s.cripto_value,
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: 12 }}
          formatter={(val: unknown) => [formatBRL(val as number)]}
        />
        <Area
          type="monotone"
          dataKey="total"
          name="Total"
          stroke="#10b981"
          fill="url(#gradTotal)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

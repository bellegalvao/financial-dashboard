'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatBRL, formatPercent, privateBRL, HIDDEN_VALUE } from '@/lib/utils'
import { usePrivacy } from '@/lib/privacy-context'
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from '@/lib/constants'
import type { AssetType } from '@/lib/types'

interface AllocationData {
  [key: string]: { value: number; pct: number }
}

interface Props {
  allocation: AllocationData
  total: number
}

export function AllocationPieChart({ allocation, total }: Props) {
  const { hidden } = usePrivacy()
  const data = (Object.entries(allocation) as [AssetType, { value: number; pct: number }][])
    .filter(([, a]) => a.value > 0)
    .map(([type, a]) => ({
      name:  ASSET_TYPE_LABELS[type] ?? type,
      value: a.value,
      pct:   a.pct,
      color: ASSET_TYPE_COLORS[type] ?? '#6b7280',
    }))

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-sm gap-2">
        <span>Nenhuma posição encontrada</span>
        <span className="text-xs">Faça o upload do extrato XP</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="42%"
            innerRadius={58}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(val: unknown, name: unknown, props: any) =>
              [hidden ? HIDDEN_VALUE : `${formatBRL(val as number)} (${formatPercent(props.payload.pct)})`, name as string]
            }
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        </PieChart>
      </ResponsiveContainer>

      <div className="text-center pt-2 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 mb-1">Total da carteira</p>
        <p className="text-lg font-bold text-zinc-100">{privateBRL(total, hidden)}</p>
      </div>
    </div>
  )
}

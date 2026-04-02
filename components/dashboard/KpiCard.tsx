import { formatBRL } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label:   string
  value:   number
  icon?:   LucideIcon
  prefix?: string
  accent?: 'emerald' | 'red' | 'purple' | 'blue' | 'zinc'
  positive?: boolean   // if true, green for positive, red for negative
}

const ACCENT_STYLES = {
  emerald: 'border-emerald-800/40 bg-emerald-950/20',
  red:     'border-red-800/40     bg-red-950/20',
  purple:  'border-purple-800/40  bg-purple-950/20',
  blue:    'border-blue-800/40    bg-blue-950/20',
  zinc:    'border-zinc-800       bg-zinc-900/50',
}

const ICON_STYLES = {
  emerald: 'text-emerald-400',
  red:     'text-red-400',
  purple:  'text-purple-400',
  blue:    'text-blue-400',
  zinc:    'text-zinc-400',
}

export function KpiCard({ label, value, icon: Icon, accent = 'zinc', positive }: Props) {
  const valueColor = positive !== undefined
    ? (value >= 0 ? 'text-emerald-400' : 'text-red-400')
    : 'text-zinc-100'

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${ACCENT_STYLES[accent]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{label}</p>
        {Icon && <Icon className={`h-4 w-4 ${ICON_STYLES[accent]}`} />}
      </div>
      <p className={`text-2xl font-bold font-mono ${valueColor}`}>
        {formatBRL(value)}
      </p>
    </div>
  )
}

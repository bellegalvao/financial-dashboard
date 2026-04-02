import { formatBRL } from '@/lib/utils'
import type { MonthlySummary } from '@/lib/types'

interface Props {
  summary: MonthlySummary
}

export function DiinheiroEmContaCard({ value }: { value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
      <p className="text-xs text-white uppercase tracking-wider font-bold mb-1">
        Dinheiro em conta
      </p>
      <p className={`text-lg sm:text-2xl font-bold leading-tight ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatBRL(value)}
      </p>
    </div>
  )
}

export function EntradasCard({ entradas }: { entradas: MonthlySummary['entradas'] }) {
  return (
    <KpiBox title="Entradas" accent="emerald">
      <KpiRow label="Fixas"  value={entradas.fixas}  positive />
      <KpiRow label="Soltas" value={entradas.soltas} positive />
      <KpiRow label="Total"  value={entradas.total}  positive bold />
    </KpiBox>
  )
}

export function SaidasCard({ saidas }: { saidas: MonthlySummary['saidas'] }) {
  return (
    <KpiBox title="Saídas" accent="red">
      <KpiRow label="Contas Fixas"  value={saidas.contas_fixas} />
      <KpiRow label="Pix/Débito"    value={saidas.pix_debito} />
      <KpiRow label="Crédito"       value={saidas.credito} />
      <KpiRow label="Caju"          value={saidas.caju} />
      <KpiRow label="Parcelados"    value={saidas.parcelados} />
      <KpiRow label="Investimento"  value={saidas.investimento} />
      <KpiRow label="Total"         value={saidas.total} bold />
    </KpiBox>
  )
}

export function BalancoCard({ balanco }: { balanco: MonthlySummary['balanco'] }) {
  return (
    <KpiBox title="Balanço" accent="blue">
      <KpiRow label="Contas a Pagar"      value={balanco.contas_a_pagar} />
      <KpiRow label="Próxima Fatura"      value={balanco.proxima_fatura} />
      <KpiRow label="Dinheiro pra Entrar" value={balanco.dinheiro_pra_entrar} positive bold />
    </KpiBox>
  )
}

export function MonthlyKpiPanel({ summary }: Props) {
  const { dinheiro_em_conta, entradas, saidas, balanco } = summary

  return (
    <div className="space-y-3">
      <DiinheiroEmContaCard value={dinheiro_em_conta} />
      <EntradasCard entradas={entradas} />
      <SaidasCard saidas={saidas} />
      <BalancoCard balanco={balanco} />
    </div>
  )
}

function KpiBox({
  title,
  accent,
  children,
}: {
  title: string
  accent: 'emerald' | 'red' | 'blue'
  children: React.ReactNode
}) {
  const colors = {
    emerald: 'border-emerald-800/50 bg-emerald-950/20 text-emerald-400',
    red:     'border-red-800/50     bg-red-950/20     text-red-400',
    blue:    'border-blue-800/50    bg-blue-950/20    text-blue-400',
  }

  return (
    <div className={`rounded-lg border p-3 ${colors[accent]}`}>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function KpiRow({
  label,
  value,
  positive = false,
  bold = false,
}: {
  label: string
  value: number
  positive?: boolean
  bold?: boolean
}) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'border-t border-current/20 pt-1 mt-1' : ''}`}>
      <span className={`text-xs text-zinc-400 ${bold ? 'font-semibold text-zinc-300' : ''}`}>{label}</span>
      <span className={`text-xs font-mono ${bold ? 'font-bold text-zinc-100' : ''} ${
        value > 0 && positive ? 'text-emerald-400' : value > 0 ? 'text-zinc-200' : 'text-zinc-500'
      }`}>
        {formatBRL(value)}
      </span>
    </div>
  )
}

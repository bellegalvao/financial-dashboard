import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { currentMonthKey } from '@/lib/utils'
import type { PatrimonioSnapshot } from '@/lib/types'

export async function GET() {
  const month = currentMonthKey()
  const year  = month.slice(0, 4)

  // Current month transactions
  const txs = db.prepare(
    'SELECT type, value FROM transactions WHERE month = ?'
  ).all(month) as { type: string; value: number }[]

  const receita_mes = txs.filter((t) => t.type === 'entrada').reduce((s, t) => s + t.value, 0)
  const gastos_mes  = txs.filter((t) => t.type !== 'entrada').reduce((s, t) => s + t.value, 0)
  const saldo_mes   = receita_mes - gastos_mes

  // Total invested this year
  const investedThisYear = (db.prepare(
    "SELECT SUM(value) as total FROM transactions WHERE type = 'investimento' AND month LIKE ?"
  ).get(`${year}-%`) as { total: number | null })?.total ?? 0

  // Live allocation from positions (avg price × quantity)
  const allocation = db.prepare(`
    SELECT asset_type, SUM(quantity * avg_price) as value
    FROM investment_positions WHERE quantity > 0
    GROUP BY asset_type
  `).all() as { asset_type: string; value: number }[]

  const alloc = { acoes: 0, fii: 0, renda_fixa: 0, fundo_investimento: 0, cripto: 0, dolar: 0 }
  for (const a of allocation) {
    if (a.asset_type in alloc) alloc[a.asset_type as keyof typeof alloc] = a.value
  }

  // Patrimônio total from live positions
  const patrimonio_total = Object.values(alloc).reduce((s, v) => s + v, 0)

  // Last 7 snapshots for mini evolution chart
  const snapshots = db.prepare(
    'SELECT * FROM patrimonio_snapshots ORDER BY month DESC LIMIT 7'
  ).all() as PatrimonioSnapshot[]

  return NextResponse.json({
    month,
    patrimonio_total,
    saldo_mes,
    total_investido_ano: investedThisYear,
    gastos_mes,
    receita_mes,
    allocation: alloc,
    snapshots: snapshots.reverse(),
  })
}

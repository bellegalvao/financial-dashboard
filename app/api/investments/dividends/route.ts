import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function DELETE() {
  const result = db.prepare("DELETE FROM investment_transactions WHERE operation = 'D'").run()
  return NextResponse.json({ deleted: result.changes })
}

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get('year')

  const rows = (year && year !== 'all'
    ? db.prepare(`
        SELECT substr(date, 1, 7) as month, ticker, asset_type, SUM(total_value) as amount
        FROM investment_transactions
        WHERE operation = 'D' AND substr(date, 1, 4) = ?
        GROUP BY month, ticker ORDER BY month ASC, amount DESC
      `).all(year)
    : db.prepare(`
        SELECT substr(date, 1, 7) as month, ticker, asset_type, SUM(total_value) as amount
        FROM investment_transactions
        WHERE operation = 'D'
        GROUP BY month, ticker ORDER BY month ASC, amount DESC
      `).all()
  ) as { month: string; ticker: string; asset_type: string; amount: number }[]

  // Available years
  const years = (db.prepare(`
    SELECT DISTINCT substr(date, 1, 4) as year FROM investment_transactions
    WHERE operation = 'D' ORDER BY year DESC
  `).all() as { year: string }[]).map((r) => r.year)

  // Group by month for chart
  const byMonth = new Map<string, { month: string; total: number; items: typeof rows }>()
  for (const row of rows) {
    if (!byMonth.has(row.month)) {
      byMonth.set(row.month, { month: row.month, total: 0, items: [] })
    }
    const entry = byMonth.get(row.month)!
    entry.total += row.amount
    entry.items.push(row)
  }

  return NextResponse.json({
    year: year ?? 'all',
    years,
    dividends: rows,
    by_month: Array.from(byMonth.values()),
    total_year: rows.reduce((s, r) => s + r.amount, 0),
  })
}

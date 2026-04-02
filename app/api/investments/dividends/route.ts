import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function DELETE() {
  const result = await db.execute({
    sql: "DELETE FROM investment_transactions WHERE operation = 'D'",
    args: [],
  })
  return NextResponse.json({ deleted: result.rowsAffected })
}

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get('year')

  const rowsResult = await (year && year !== 'all'
    ? db.execute({
        sql: `SELECT substr(date, 1, 7) as month, ticker, asset_type, SUM(total_value) as amount
          FROM investment_transactions
          WHERE operation = 'D' AND substr(date, 1, 4) = ?
          GROUP BY month, ticker ORDER BY month ASC, amount DESC`,
        args: [year],
      })
    : db.execute({
        sql: `SELECT substr(date, 1, 7) as month, ticker, asset_type, SUM(total_value) as amount
          FROM investment_transactions
          WHERE operation = 'D'
          GROUP BY month, ticker ORDER BY month ASC, amount DESC`,
        args: [],
      })
  )
  const rows = rowsResult.rows as unknown as { month: string; ticker: string; asset_type: string; amount: number }[]

  // Available years
  const yearsResult = await db.execute({
    sql: `SELECT DISTINCT substr(date, 1, 4) as year FROM investment_transactions
      WHERE operation = 'D' ORDER BY year DESC`,
    args: [],
  })
  const years = (yearsResult.rows as unknown as { year: string }[]).map((r) => r.year)

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

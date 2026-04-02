import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')

  const categories = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY name').all()

  if (!month) return NextResponse.json(categories)

  // Enrich with budget and real spending for the given month
  const budgets = db.prepare(
    'SELECT * FROM category_budgets WHERE month = ?'
  ).all(month) as { category: string; budget: number }[]

  const spending = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(value) as real
    FROM transactions
    WHERE month = ? AND type != 'entrada'
    GROUP BY category
  `).all(month) as { category: string; count: number; real: number }[]

  const budgetMap = new Map(budgets.map((b) => [b.category, b.budget]))
  const spendMap  = new Map(spending.map((s) => [s.category, s]))

  const enriched = (categories as { name: string }[]).map((cat) => ({
    ...cat,
    budget: budgetMap.get(cat.name) ?? 0,
    real:   spendMap.get(cat.name)?.real ?? 0,
    count:  spendMap.get(cat.name)?.count ?? 0,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { name, type, color } = await req.json()
  if (!name || !type) return NextResponse.json({ error: 'name e type obrigatórios' }, { status: 400 })

  const result = db.prepare(
    'INSERT INTO categories (name, type, color) VALUES (?, ?, ?)'
  ).run(name, type, color ?? null)

  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { category, month, budget } = await req.json()
  if (!category || !month || budget === undefined) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  db.prepare(`
    INSERT INTO category_budgets (category, month, budget)
    VALUES (?, ?, ?)
    ON CONFLICT(category, month) DO UPDATE SET budget = excluded.budget
  `).run(category, month, budget)

  return NextResponse.json({ success: true })
}

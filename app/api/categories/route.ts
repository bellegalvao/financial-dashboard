import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')

  const categoriesResult = await db.execute({
    sql: 'SELECT * FROM categories WHERE active = 1 ORDER BY name',
    args: [],
  })
  const categories = categoriesResult.rows

  if (!month) return NextResponse.json(categories)

  // Enrich with budget and real spending for the given month
  const budgetsResult = await db.execute({
    sql: 'SELECT * FROM category_budgets WHERE month = ?',
    args: [month],
  })
  const budgets = budgetsResult.rows as unknown as { category: string; budget: number }[]

  const spendingResult = await db.execute({
    sql: `SELECT category, COUNT(*) as count, SUM(value) as real
      FROM transactions
      WHERE month = ? AND type != 'entrada'
      GROUP BY category`,
    args: [month],
  })
  const spending = spendingResult.rows as unknown as { category: string; count: number; real: number }[]

  const budgetMap = new Map(budgets.map((b) => [b.category, b.budget]))
  const spendMap  = new Map(spending.map((s) => [s.category, s]))

  const enriched = (categories as unknown as { name: string }[]).map((cat) => ({
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

  const result = await db.execute({
    sql: 'INSERT INTO categories (name, type, color) VALUES (?, ?, ?)',
    args: [name, type, color ?? null],
  })

  const created = await db.execute({
    sql: 'SELECT * FROM categories WHERE id = ?',
    args: [Number(result.lastInsertRowid)],
  })
  return NextResponse.json(created.rows[0], { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, name, type, color } = await req.json()
  if (!id || !name || !type) return NextResponse.json({ error: 'id, name e type obrigatórios' }, { status: 400 })

  await db.execute({
    sql: 'UPDATE categories SET name = ?, type = ?, color = ? WHERE id = ?',
    args: [name, type, color ?? null, id],
  })

  const updated = await db.execute({
    sql: 'SELECT * FROM categories WHERE id = ?',
    args: [id],
  })
  return NextResponse.json(updated.rows[0])
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  await db.execute({
    sql: 'UPDATE categories SET active = 0 WHERE id = ?',
    args: [id],
  })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { category, month, budget } = await req.json()
  if (!category || !month || budget === undefined) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  await db.execute({
    sql: `INSERT INTO category_budgets (category, month, budget)
      VALUES (?, ?, ?)
      ON CONFLICT(category, month) DO UPDATE SET budget = excluded.budget`,
    args: [category, month, budget],
  })

  return NextResponse.json({ success: true })
}

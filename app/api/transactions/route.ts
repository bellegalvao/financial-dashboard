import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { parseMonthKey } from '@/lib/utils'
import type { TransactionInput } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const month    = searchParams.get('month')
  const type     = searchParams.get('type')
  const category = searchParams.get('category')

  let query = 'SELECT * FROM transactions WHERE 1=1'
  const params: unknown[] = []

  if (month)    { query += ' AND month = ?';    params.push(month) }
  if (type)     { query += ' AND type = ?';     params.push(type) }
  if (category) { query += ' AND category = ?'; params.push(category) }

  query += ' ORDER BY date DESC, id DESC'

  const rows = db.prepare(query).all(...params)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const body: TransactionInput = await req.json()

  const { date, value, payment_method, category, type, description,
          installment_total, installment_current } = body

  if (!date || !value || !payment_method || !category || !type) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const month = parseMonthKey(date)

  const stmt = db.prepare(`
    INSERT INTO transactions
      (date, value, payment_method, category, type, description, month, installment_total, installment_current)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    date, value, payment_method, category, type,
    description ?? null, month,
    installment_total ?? null, installment_current ?? null
  )

  const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(created, { status: 201 })
}

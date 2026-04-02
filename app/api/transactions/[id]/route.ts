import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { parseMonthKey } from '@/lib/utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const {
    date, value, payment_method, category, type,
    description, installment_total, installment_current,
  } = body

  const month = date ? parseMonthKey(date) : (existing as { month: string }).month

  db.prepare(`
    UPDATE transactions SET
      date = ?, value = ?, payment_method = ?, category = ?, type = ?,
      description = ?, month = ?, installment_total = ?, installment_current = ?
    WHERE id = ?
  `).run(
    date   ?? (existing as { date: string }).date,
    value  ?? (existing as { value: number }).value,
    payment_method ?? (existing as { payment_method: string }).payment_method,
    category ?? (existing as { category: string }).category,
    type ?? (existing as { type: string }).type,
    description ?? (existing as { description: string | null }).description,
    month,
    installment_total  ?? (existing as { installment_total: number | null }).installment_total,
    installment_current ?? (existing as { installment_current: number | null }).installment_current,
    id
  )

  const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id)
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}

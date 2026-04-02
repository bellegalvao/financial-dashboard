import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { parseMonthKey } from '@/lib/utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const existingResult = await db.execute({
    sql: 'SELECT * FROM transactions WHERE id = ?',
    args: [id],
  })
  const existing = existingResult.rows[0] as unknown as {
    date: string; value: number; payment_method: string; category: string;
    type: string; description: string | null; month: string;
    installment_total: number | null; installment_current: number | null;
  } | undefined

  if (!existing) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const {
    date, value, payment_method, category, type,
    description, installment_total, installment_current,
  } = body

  const month = date ? parseMonthKey(date) : existing.month

  await db.execute({
    sql: `UPDATE transactions SET
      date = ?, value = ?, payment_method = ?, category = ?, type = ?,
      description = ?, month = ?, installment_total = ?, installment_current = ?
    WHERE id = ?`,
    args: [
      date   ?? existing.date,
      value  ?? existing.value,
      payment_method ?? existing.payment_method,
      category ?? existing.category,
      type ?? existing.type,
      description ?? existing.description,
      month,
      installment_total  ?? existing.installment_total,
      installment_current ?? existing.installment_current,
      id,
    ],
  })

  const updated = await db.execute({
    sql: 'SELECT * FROM transactions WHERE id = ?',
    args: [id],
  })
  return NextResponse.json(updated.rows[0])
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const existingResult = await db.execute({
    sql: 'SELECT id FROM transactions WHERE id = ?',
    args: [id],
  })
  if (!existingResult.rows[0]) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  await db.execute({ sql: 'DELETE FROM transactions WHERE id = ?', args: [id] })
  return NextResponse.json({ success: true })
}

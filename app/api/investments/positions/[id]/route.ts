import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const posResult = await db.execute({
    sql: 'SELECT * FROM investment_positions WHERE id = ?',
    args: [Number(id)],
  })
  const pos = posResult.rows[0]
  if (!pos) return NextResponse.json({ error: 'Posição não encontrada' }, { status: 404 })

  if ('asset_type' in body) {
    await db.execute({
      sql: 'UPDATE investment_positions SET asset_type = ? WHERE id = ?',
      args: [body.asset_type, Number(id)],
    })
  }
  if ('subtype' in body) {
    await db.execute({
      sql: 'UPDATE investment_positions SET subtype = ? WHERE id = ?',
      args: [body.subtype ?? null, Number(id)],
    })
  }
  if ('ticker' in body && typeof body.ticker === 'string' && body.ticker.trim()) {
    await db.execute({
      sql: 'UPDATE investment_positions SET ticker = ? WHERE id = ?',
      args: [body.ticker.trim().toUpperCase(), Number(id)],
    })
  }
  if ('quantity' in body && typeof body.quantity === 'number') {
    await db.execute({
      sql: 'UPDATE investment_positions SET quantity = ? WHERE id = ?',
      args: [body.quantity, Number(id)],
    })
  }
  if ('avg_price' in body && typeof body.avg_price === 'number') {
    await db.execute({
      sql: 'UPDATE investment_positions SET avg_price = ? WHERE id = ?',
      args: [body.avg_price, Number(id)],
    })
  }

  const updated = await db.execute({
    sql: 'SELECT * FROM investment_positions WHERE id = ?',
    args: [Number(id)],
  })
  return NextResponse.json(updated.rows[0])
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const posResult = await db.execute({
    sql: 'SELECT ticker FROM investment_positions WHERE id = ?',
    args: [Number(id)],
  })
  const pos = posResult.rows[0] as unknown as { ticker: string } | undefined
  if (!pos) return NextResponse.json({ error: 'Posição não encontrada' }, { status: 404 })

  await db.batch([
    { sql: 'DELETE FROM investment_transactions WHERE ticker = ?', args: [pos.ticker] },
    { sql: 'DELETE FROM investment_positions WHERE id = ?', args: [Number(id)] },
  ], 'write')

  return NextResponse.json({ ok: true })
}

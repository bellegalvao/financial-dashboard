import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const pos = db.prepare('SELECT * FROM investment_positions WHERE id = ?').get(Number(id))
  if (!pos) return NextResponse.json({ error: 'Posição não encontrada' }, { status: 404 })

  if ('asset_type' in body) {
    db.prepare('UPDATE investment_positions SET asset_type = ? WHERE id = ?').run(body.asset_type, Number(id))
  }
  if ('subtype' in body) {
    db.prepare('UPDATE investment_positions SET subtype = ? WHERE id = ?').run(body.subtype ?? null, Number(id))
  }
  if ('ticker' in body && typeof body.ticker === 'string' && body.ticker.trim()) {
    db.prepare('UPDATE investment_positions SET ticker = ? WHERE id = ?').run(body.ticker.trim().toUpperCase(), Number(id))
  }
  if ('quantity' in body && typeof body.quantity === 'number') {
    db.prepare('UPDATE investment_positions SET quantity = ? WHERE id = ?').run(body.quantity, Number(id))
  }
  if ('avg_price' in body && typeof body.avg_price === 'number') {
    db.prepare('UPDATE investment_positions SET avg_price = ? WHERE id = ? ').run(body.avg_price, Number(id))
  }

  const updated = db.prepare('SELECT * FROM investment_positions WHERE id = ?').get(Number(id))
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const pos = db.prepare('SELECT ticker FROM investment_positions WHERE id = ?').get(Number(id)) as { ticker: string } | undefined
  if (!pos) return NextResponse.json({ error: 'Posição não encontrada' }, { status: 404 })

  db.transaction(() => {
    db.prepare('DELETE FROM investment_transactions WHERE ticker = ?').run(pos.ticker)
    db.prepare('DELETE FROM investment_positions WHERE id = ?').run(Number(id))
  })()

  return NextResponse.json({ ok: true })
}

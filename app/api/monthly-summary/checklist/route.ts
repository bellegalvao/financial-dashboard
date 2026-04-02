import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { ChecklistItem, ChecklistSection, PaymentMethod, TransactionType } from '@/lib/types'

const SECTION_TX: Record<ChecklistSection, { type: TransactionType; payment_method: PaymentMethod }> = {
  entradas:     { type: 'entrada',      payment_method: 'debito_pix' },
  contas_fixas: { type: 'conta_fixa',   payment_method: 'debito_pix' },
  investimento: { type: 'investimento', payment_method: 'debito_pix' },
  parcelados:   { type: 'parcelado',    payment_method: 'credito'    },
}

async function createTransaction(item: ChecklistItem & { transaction_id: number | null }): Promise<number> {
  const { type, payment_method } = SECTION_TX[item.section]
  const result = await db.execute({
    sql: `INSERT INTO transactions (date, value, payment_method, category, type, description, month)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `${item.month}-01`,
      item.expected_value ?? 0,
      payment_method,
      item.item_name,
      type,
      'Lançamento via checklist',
      item.month,
    ],
  })
  return Number(result.lastInsertRowid)
}

// ── POST — cria novo item ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { month, section, item_name } = body

  if (!month || !section || !item_name) {
    return NextResponse.json({ error: 'month, section e item_name obrigatórios' }, { status: 400 })
  }

  const result = await db.execute({
    sql: 'INSERT INTO monthly_checklist (month, item_name, section, expected_value) VALUES (?, ?, ?, NULL)',
    args: [month, item_name, section],
  })

  const created = await db.execute({
    sql: 'SELECT * FROM monthly_checklist WHERE id = ?',
    args: [Number(result.lastInsertRowid)],
  })
  return NextResponse.json(created.rows[0], { status: 201 })
}

// ── PATCH — atualiza checked / expected_value / item_name ────────────────────

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id } = body

  if (id === undefined) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  }

  const itemResult = await db.execute({
    sql: 'SELECT * FROM monthly_checklist WHERE id = ?',
    args: [id],
  })
  const item = itemResult.rows[0] as unknown as (ChecklistItem & { transaction_id: number | null }) | undefined

  if (!item) {
    return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  }

  if ('checked' in body) {
    const nowChecked = Boolean(body.checked)
    if (nowChecked && !item.transaction_id) {
      const txId = await createTransaction(item)
      await db.execute({
        sql: 'UPDATE monthly_checklist SET checked = 1, transaction_id = ? WHERE id = ?',
        args: [txId, id],
      })
    } else if (!nowChecked && item.transaction_id) {
      await db.batch([
        { sql: 'DELETE FROM transactions WHERE id = ?', args: [item.transaction_id] },
        { sql: 'UPDATE monthly_checklist SET checked = 0, transaction_id = NULL WHERE id = ?', args: [id] },
      ], 'write')
    } else {
      await db.execute({
        sql: 'UPDATE monthly_checklist SET checked = ? WHERE id = ?',
        args: [nowChecked ? 1 : 0, id],
      })
    }
  }

  if ('expected_value' in body) {
    const val = body.expected_value === '' || body.expected_value === null
      ? null
      : Number(body.expected_value)
    await db.execute({
      sql: 'UPDATE monthly_checklist SET expected_value = ? WHERE id = ?',
      args: [val, id],
    })

    const refreshedResult = await db.execute({
      sql: 'SELECT * FROM monthly_checklist WHERE id = ?',
      args: [id],
    })
    const refreshed = refreshedResult.rows[0] as unknown as (ChecklistItem & { transaction_id: number | null }) | undefined
    if (refreshed?.transaction_id) {
      await db.execute({
        sql: 'UPDATE transactions SET value = ? WHERE id = ?',
        args: [val ?? 0, refreshed.transaction_id],
      })
    }
  }

  if ('item_name' in body && body.item_name?.trim()) {
    const name = body.item_name.trim()
    await db.execute({
      sql: 'UPDATE monthly_checklist SET item_name = ? WHERE id = ?',
      args: [name, id],
    })

    // Keep linked transaction category in sync
    const refreshedResult = await db.execute({
      sql: 'SELECT * FROM monthly_checklist WHERE id = ?',
      args: [id],
    })
    const refreshed = refreshedResult.rows[0] as unknown as (ChecklistItem & { transaction_id: number | null }) | undefined
    if (refreshed?.transaction_id) {
      await db.execute({
        sql: 'UPDATE transactions SET category = ? WHERE id = ?',
        args: [name, refreshed.transaction_id],
      })
    }
  }

  const updated = await db.execute({
    sql: 'SELECT * FROM monthly_checklist WHERE id = ?',
    args: [id],
  })
  return NextResponse.json(updated.rows[0])
}

// ── DELETE — remove item e transação vinculada ───────────────────────────────

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  if (id === undefined) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  }

  const itemResult = await db.execute({
    sql: 'SELECT * FROM monthly_checklist WHERE id = ?',
    args: [id],
  })
  const item = itemResult.rows[0] as unknown as (ChecklistItem & { transaction_id: number | null }) | undefined

  if (!item) {
    return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  }

  if (item.transaction_id) {
    await db.batch([
      { sql: 'DELETE FROM transactions WHERE id = ?', args: [item.transaction_id] },
      { sql: 'DELETE FROM monthly_checklist WHERE id = ?', args: [id] },
    ], 'write')
  } else {
    await db.execute({ sql: 'DELETE FROM monthly_checklist WHERE id = ?', args: [id] })
  }

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { ChecklistItem, ChecklistSection, PaymentMethod, TransactionType } from '@/lib/types'

const SECTION_TX: Record<ChecklistSection, { type: TransactionType; payment_method: PaymentMethod }> = {
  entradas:     { type: 'entrada',      payment_method: 'debito_pix' },
  contas_fixas: { type: 'conta_fixa',   payment_method: 'debito_pix' },
  investimento: { type: 'investimento', payment_method: 'debito_pix' },
  parcelados:   { type: 'parcelado',    payment_method: 'credito'    },
}

function createTransaction(item: ChecklistItem & { transaction_id: number | null }): number {
  const { type, payment_method } = SECTION_TX[item.section]
  const result = db.prepare(`
    INSERT INTO transactions (date, value, payment_method, category, type, description, month)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `${item.month}-01`,
    item.expected_value ?? 0,
    payment_method,
    item.item_name,
    type,
    'Lançamento via checklist',
    item.month,
  )
  return result.lastInsertRowid as number
}

// ── POST — cria novo item ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { month, section, item_name } = body

  if (!month || !section || !item_name) {
    return NextResponse.json({ error: 'month, section e item_name obrigatórios' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO monthly_checklist (month, item_name, section, expected_value)
    VALUES (?, ?, ?, NULL)
  `).run(month, item_name, section)

  const created = db.prepare('SELECT * FROM monthly_checklist WHERE id = ?').get(result.lastInsertRowid)
  return NextResponse.json(created, { status: 201 })
}

// ── PATCH — atualiza checked / expected_value / item_name ────────────────────

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id } = body

  if (id === undefined) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  }

  const item = db.prepare('SELECT * FROM monthly_checklist WHERE id = ?').get(id) as
    (ChecklistItem & { transaction_id: number | null }) | undefined

  if (!item) {
    return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  }

  if ('checked' in body) {
    const nowChecked = Boolean(body.checked)
    if (nowChecked && !item.transaction_id) {
      const txId = createTransaction(item)
      db.prepare('UPDATE monthly_checklist SET checked = 1, transaction_id = ? WHERE id = ?').run(txId, id)
    } else if (!nowChecked && item.transaction_id) {
      db.prepare('DELETE FROM transactions WHERE id = ?').run(item.transaction_id)
      db.prepare('UPDATE monthly_checklist SET checked = 0, transaction_id = NULL WHERE id = ?').run(id)
    } else {
      db.prepare('UPDATE monthly_checklist SET checked = ? WHERE id = ?').run(nowChecked ? 1 : 0, id)
    }
  }

  if ('expected_value' in body) {
    const val = body.expected_value === '' || body.expected_value === null
      ? null
      : Number(body.expected_value)
    db.prepare('UPDATE monthly_checklist SET expected_value = ? WHERE id = ?').run(val, id)

    const refreshed = db.prepare('SELECT * FROM monthly_checklist WHERE id = ?').get(id) as
      (ChecklistItem & { transaction_id: number | null }) | undefined
    if (refreshed?.transaction_id) {
      db.prepare('UPDATE transactions SET value = ? WHERE id = ?').run(val ?? 0, refreshed.transaction_id)
    }
  }

  if ('item_name' in body && body.item_name?.trim()) {
    const name = body.item_name.trim()
    db.prepare('UPDATE monthly_checklist SET item_name = ? WHERE id = ?').run(name, id)

    // Keep linked transaction category in sync
    const refreshed = db.prepare('SELECT * FROM monthly_checklist WHERE id = ?').get(id) as
      (ChecklistItem & { transaction_id: number | null }) | undefined
    if (refreshed?.transaction_id) {
      db.prepare('UPDATE transactions SET category = ? WHERE id = ?').run(name, refreshed.transaction_id)
    }
  }

  const updated = db.prepare('SELECT * FROM monthly_checklist WHERE id = ?').get(id)
  return NextResponse.json(updated)
}

// ── DELETE — remove item e transação vinculada ───────────────────────────────

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  if (id === undefined) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  }

  const item = db.prepare('SELECT * FROM monthly_checklist WHERE id = ?').get(id) as
    (ChecklistItem & { transaction_id: number | null }) | undefined

  if (!item) {
    return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
  }

  if (item.transaction_id) {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(item.transaction_id)
  }
  db.prepare('DELETE FROM monthly_checklist WHERE id = ?').run(id)

  return NextResponse.json({ ok: true })
}

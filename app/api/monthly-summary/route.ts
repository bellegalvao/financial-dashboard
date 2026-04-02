import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { CHECKLIST_DEFAULTS } from '@/lib/constants'
import { prevMonthKey } from '@/lib/utils'
import type { MonthlySummary, ChecklistItem, CategoryType } from '@/lib/types'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month obrigatório' }, { status: 400 })

  // ── Ensure checklist rows exist for this month ───────────────────────────
  const existingCount = (db.prepare(
    'SELECT COUNT(*) as n FROM monthly_checklist WHERE month = ?'
  ).get(month) as { n: number }).n

  if (existingCount === 0) {
    // Try to seed from previous month's items (with their values)
    const prev = prevMonthKey(month)
    const prevItems = db.prepare(
      'SELECT item_name, section, expected_value FROM monthly_checklist WHERE month = ? ORDER BY section, id'
    ).all(prev) as { item_name: string; section: string; expected_value: number | null }[]

    const source = prevItems.length > 0 ? prevItems : CHECKLIST_DEFAULTS

    const insertChecklist = db.prepare(`
      INSERT OR IGNORE INTO monthly_checklist (month, item_name, section, expected_value)
      VALUES (?, ?, ?, ?)
    `)
    db.transaction(() => {
      for (const item of source) {
        insertChecklist.run(month, item.item_name, item.section, item.expected_value ?? null)
      }
    })()
  }

  // ── Fetch transactions for month ─────────────────────────────────────────
  const txs = db.prepare('SELECT * FROM transactions WHERE month = ?').all(month) as {
    type: string; value: number; payment_method: string; category: string
  }[]

  const entradas   = txs.filter((t) => t.type === 'entrada')
  const saidas     = txs.filter((t) => t.type === 'saida' || t.type === 'conta_fixa' || t.type === 'parcelado' || t.type === 'investimento')

  // Classify fixed vs variable income
  const FIXED_INCOME = ['Salário', 'Caju']
  const fixas  = entradas.filter((t) => FIXED_INCOME.includes(t.category)).reduce((s, t) => s + t.value, 0)
  const soltas = entradas.filter((t) => !FIXED_INCOME.includes(t.category)).reduce((s, t) => s + t.value, 0)
  const totalEntradas = fixas + soltas

  // Saidas by form of payment
  const contasFixas   = txs.filter((t) => t.type === 'conta_fixa').reduce((s, t) => s + t.value, 0)
  const pixDebito     = txs.filter((t) => t.type === 'saida' && t.payment_method === 'debito_pix').reduce((s, t) => s + t.value, 0)
  const credito       = txs.filter((t) => t.type === 'saida' && t.payment_method === 'credito').reduce((s, t) => s + t.value, 0)
  const caju          = txs.filter((t) => t.type === 'saida' && t.payment_method === 'caju').reduce((s, t) => s + t.value, 0)
  const parcelados    = txs.filter((t) => t.type === 'parcelado').reduce((s, t) => s + t.value, 0)
  const investimento  = txs.filter((t) => t.type === 'investimento').reduce((s, t) => s + t.value, 0)
  const totalSaidas   = contasFixas + pixDebito + credito + caju + parcelados + investimento

  const dinheiroEmConta = totalEntradas - totalSaidas

  // ── Checklist ────────────────────────────────────────────────────────────
  const checklist = db.prepare(
    'SELECT * FROM monthly_checklist WHERE month = ? ORDER BY section, id'
  ).all(month) as ChecklistItem[]

  // ── Category breakdown ───────────────────────────────────────────────────
  const spending = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(value) as real
    FROM transactions WHERE month = ? AND type != 'entrada'
    GROUP BY category
  `).all(month) as { category: string; count: number; real: number }[]

  const budgets = db.prepare(
    'SELECT category, budget FROM category_budgets WHERE month = ?'
  ).all(month) as { category: string; budget: number }[]

  const allCategories = db.prepare(
    "SELECT id, name, type, color, active FROM categories WHERE active = 1"
  ).all() as { id: number; name: string; type: CategoryType; color: string | null; active: number }[]

  const budgetMap = new Map(budgets.map((b) => [b.category, b.budget]))
  const spendMap  = new Map(spending.map((s) => [s.category, s]))

  const category_breakdown = allCategories.map((cat) => ({
    ...cat,
    budget: budgetMap.get(cat.name) ?? 0,
    real:   spendMap.get(cat.name)?.real ?? 0,
    count:  spendMap.get(cat.name)?.count ?? 0,
  })).filter((c) => c.real > 0 || c.budget > 0)

  // ── Próxima fatura (crédito + parcelados não pagos) ──────────────────────
  const proximaFatura = credito + parcelados
  const contasAPagar = checklist
    .filter((item) => item.section === 'contas_fixas' && item.checked === 0 && item.expected_value)
    .reduce((s, item) => s + (item.expected_value ?? 0), 0)

  const summary: MonthlySummary = {
    month,
    dinheiro_em_conta: dinheiroEmConta,
    entradas: { fixas, soltas, total: totalEntradas },
    saidas: {
      contas_fixas: contasFixas,
      pix_debito:   pixDebito,
      credito,
      caju,
      parcelados,
      investimento,
      total: totalSaidas,
    },
    balanco: {
      contas_a_pagar:      contasAPagar,
      proxima_fatura:      proximaFatura,
      dinheiro_pra_entrar: totalEntradas + contasAPagar,
    },
    checklist,
    category_breakdown,
  }

  return NextResponse.json(summary)
}

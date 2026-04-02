import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { CHECKLIST_DEFAULTS } from '@/lib/constants'
import { prevMonthKey } from '@/lib/utils'
import type { MonthlySummary, ChecklistItem, CategoryType } from '@/lib/types'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month obrigatório' }, { status: 400 })

  // ── Ensure checklist rows exist for this month ───────────────────────────
  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as n FROM monthly_checklist WHERE month = ?',
    args: [month],
  })
  const existingCount = (countResult.rows[0] as unknown as { n: number }).n

  if (existingCount === 0) {
    // Try to seed from previous month's items (with their values)
    const prev = prevMonthKey(month)
    const prevResult = await db.execute({
      sql: 'SELECT item_name, section, expected_value FROM monthly_checklist WHERE month = ? ORDER BY section, id',
      args: [prev],
    })
    const prevItems = prevResult.rows as unknown as { item_name: string; section: string; expected_value: number | null }[]

    const source = prevItems.length > 0 ? prevItems : CHECKLIST_DEFAULTS

    await db.batch(
      source.map((item) => ({
        sql: 'INSERT OR IGNORE INTO monthly_checklist (month, item_name, section, expected_value) VALUES (?, ?, ?, ?)',
        args: [month, item.item_name, item.section, item.expected_value ?? null],
      })),
      'write'
    )
  }

  // ── Fetch transactions for month ─────────────────────────────────────────
  const txsResult = await db.execute({
    sql: 'SELECT * FROM transactions WHERE month = ?',
    args: [month],
  })
  const txs = txsResult.rows as unknown as {
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
  const checklistResult = await db.execute({
    sql: 'SELECT * FROM monthly_checklist WHERE month = ? ORDER BY section, id',
    args: [month],
  })
  const checklist = checklistResult.rows as unknown as ChecklistItem[]

  // ── Category breakdown ───────────────────────────────────────────────────
  const spendingResult = await db.execute({
    sql: `SELECT category, COUNT(*) as count, SUM(value) as real
      FROM transactions WHERE month = ? AND type != 'entrada'
      GROUP BY category`,
    args: [month],
  })
  const spending = spendingResult.rows as unknown as { category: string; count: number; real: number }[]

  const budgetsResult = await db.execute({
    sql: 'SELECT category, budget FROM category_budgets WHERE month = ?',
    args: [month],
  })
  const budgets = budgetsResult.rows as unknown as { category: string; budget: number }[]

  const allCategoriesResult = await db.execute({
    sql: 'SELECT id, name, type, color, active FROM categories WHERE active = 1',
    args: [],
  })
  const allCategories = allCategoriesResult.rows as unknown as { id: number; name: string; type: CategoryType; color: string | null; active: number }[]

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

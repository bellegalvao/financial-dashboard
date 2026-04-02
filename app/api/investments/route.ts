import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { computePositions, parseMonthKey } from '@/lib/utils'
import { fetchBtcPriceBRL, fetchUsdPriceBRL } from '@/lib/crypto'
import type { PatrimonioSnapshot, InvestmentTransaction, InvestmentTransactionInput } from '@/lib/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const transactions: InvestmentTransactionInput[] = body.transactions

  if (!Array.isArray(transactions) || !transactions.length) {
    return NextResponse.json({ error: 'Nenhuma transação informada' }, { status: 400 })
  }

  const insertTx = db.prepare(`
    INSERT INTO investment_transactions
      (date, ticker, asset_type, operation, quantity, unit_price, total_value, source_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')
  `)

  const insertAll = db.transaction(() => {
    for (const tx of transactions) {
      insertTx.run(
        tx.date, tx.ticker.toUpperCase().trim(), tx.asset_type, tx.operation,
        tx.quantity ?? null, tx.unit_price ?? null, tx.total_value
      )
    }
  })
  insertAll()

  // Recompute positions from all transactions
  const allTxs = db.prepare(
    'SELECT * FROM investment_transactions ORDER BY date ASC, id ASC'
  ).all() as InvestmentTransaction[]

  const positions = computePositions(allTxs)

  const upsertPosition = db.prepare(`
    INSERT INTO investment_positions (ticker, asset_type, quantity, avg_price, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(ticker) DO UPDATE SET
      asset_type = excluded.asset_type,
      quantity   = excluded.quantity,
      avg_price  = excluded.avg_price,
      updated_at = excluded.updated_at
  `)

  const upsertAll = db.transaction(() => {
    for (const pos of positions) {
      upsertPosition.run(pos.ticker, pos.asset_type, pos.quantity, pos.avg_price)
    }
  })
  upsertAll()

  db.prepare('DELETE FROM investment_positions WHERE quantity = 0').run()

  const affectedMonths = [...new Set(transactions.map((t) => parseMonthKey(t.date)))]
  updatePatrimonioSnapshots(affectedMonths)

  return NextResponse.json({ imported: transactions.length })
}

export async function GET() {
  // Patrimônio snapshots (for line chart)
  const snapshots = db.prepare(
    'SELECT * FROM patrimonio_snapshots ORDER BY month ASC'
  ).all() as PatrimonioSnapshot[]

  // Current allocation from positions — use live BTC price for cripto
  const positions = db.prepare(
    'SELECT asset_type, quantity, avg_price FROM investment_positions WHERE quantity > 0'
  ).all() as { asset_type: string; quantity: number; avg_price: number }[]

  const hasCripto = positions.some((p) => p.asset_type === 'cripto')
  const hasDolar  = positions.some((p) => p.asset_type === 'dolar')

  const [btcPrice, usdPrice] = await Promise.all([
    hasCripto ? fetchBtcPriceBRL() : Promise.resolve(null),
    hasDolar  ? fetchUsdPriceBRL() : Promise.resolve(null),
  ])

  const allocationMap: Record<string, { value: number; pct: number }> = {}
  let total = 0

  for (const pos of positions) {
    let price = pos.avg_price
    if (pos.asset_type === 'cripto' && btcPrice) price = btcPrice
    if (pos.asset_type === 'dolar'  && usdPrice) price = usdPrice
    const value = pos.quantity * price
    total += value
    if (!allocationMap[pos.asset_type]) allocationMap[pos.asset_type] = { value: 0, pct: 0 }
    allocationMap[pos.asset_type].value += value
  }

  for (const key of Object.keys(allocationMap)) {
    allocationMap[key].pct = total > 0 ? (allocationMap[key].value / total) * 100 : 0
  }

  return NextResponse.json({ snapshots, allocation: allocationMap, total })
}

function updatePatrimonioSnapshots(months: string[]) {
  const upsertSnapshot = db.prepare(`
    INSERT INTO patrimonio_snapshots (month, total_value, acoes_value, fii_value, renda_fixa_value, cripto_value, dolar_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(month) DO UPDATE SET
      total_value      = excluded.total_value,
      acoes_value      = excluded.acoes_value,
      fii_value        = excluded.fii_value,
      renda_fixa_value = excluded.renda_fixa_value,
      cripto_value     = excluded.cripto_value,
      dolar_value      = excluded.dolar_value,
      captured_at      = datetime('now')
  `)

  for (const month of months.sort()) {
    const txsUntil = db.prepare(
      "SELECT * FROM investment_transactions WHERE date <= ? ORDER BY date ASC, id ASC"
    ).all(`${month}-31`) as InvestmentTransaction[]

    const positions = computePositions(txsUntil)

    let total = 0, acoes = 0, fii = 0, renda_fixa = 0, cripto = 0, dolar = 0
    for (const pos of positions) {
      const val = pos.quantity * pos.avg_price
      total += val
      if (pos.asset_type === 'acoes')           acoes      += val
      else if (pos.asset_type === 'fii')        fii        += val
      else if (pos.asset_type === 'renda_fixa') renda_fixa += val
      else if (pos.asset_type === 'cripto')     cripto     += val
      else if (pos.asset_type === 'dolar')      dolar      += val
    }

    upsertSnapshot.run(month, total, acoes, fii, renda_fixa, cripto, dolar)
  }
}

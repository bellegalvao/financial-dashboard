import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { parseXpFile, parsePosicaoDetalhada, isPosicaoDetalhada, isExtratoContaXP, parseExtratoContaXP } from '@/lib/xp-parser'
import { computePositions, parseMonthKey } from '@/lib/utils'
import type { InvestmentTransaction, AssetType } from '@/lib/types'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
    return NextResponse.json({ error: 'Formato inválido. Use .xlsx, .xls ou .csv' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // ── PosicaoDetalhada (snapshot) ─────────────────────────────────────────────
  if (isPosicaoDetalhada(buffer)) {
    const { positions, patrimonio, dividends } = parsePosicaoDetalhada(buffer)

    if (!positions.length) {
      return NextResponse.json({ error: 'Nenhuma posição encontrada no arquivo' }, { status: 422 })
    }

    // Snapshot das posições atuais antes de qualquer alteração
    const beforeResult = await db.execute({ sql: 'SELECT ticker, asset_type FROM investment_positions', args: [] })
    const beforeSet = new Set((beforeResult.rows as unknown as { ticker: string }[]).map((r) => r.ticker))

    const importedTickers = positions.map((p) => p.ticker)
    const importedSet = new Set(importedTickers)
    const placeholders = importedTickers.map(() => '?').join(',')

    await db.batch([
      ...positions.map((pos) => ({
        sql: `INSERT INTO investment_positions (ticker, asset_type, quantity, avg_price, subtype, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(ticker) DO UPDATE SET
            quantity   = excluded.quantity,
            avg_price  = excluded.avg_price,
            updated_at = excluded.updated_at`,
        args: [pos.ticker, pos.asset_type, pos.quantity, pos.avg_price, pos.subtype ?? null],
      })),
      {
        sql: `DELETE FROM investment_positions WHERE ticker NOT IN (${placeholders}) AND asset_type NOT IN ('cripto', 'dolar')`,
        args: importedTickers,
      },
    ], 'write')

    if (patrimonio) {
      await db.execute({
        sql: `INSERT INTO patrimonio_snapshots
          (month, total_value, acoes_value, fii_value, renda_fixa_value, cripto_value, dolar_value)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(month) DO UPDATE SET
          total_value      = excluded.total_value,
          acoes_value      = excluded.acoes_value,
          fii_value        = excluded.fii_value,
          renda_fixa_value = excluded.renda_fixa_value,
          cripto_value     = excluded.cripto_value,
          captured_at      = datetime('now')`,
        args: [
          patrimonio.month, patrimonio.total_value,
          patrimonio.acoes_value, patrimonio.fii_value,
          patrimonio.renda_fixa_value, patrimonio.cripto_value,
        ],
      })
    }

    // Insert provisioned dividends (idempotent: remove previous from same file first)
    if (dividends.length) {
      const srcFile = `dividendos::${file.name}`
      await db.batch([
        { sql: 'DELETE FROM investment_transactions WHERE source_file = ?', args: [srcFile] },
        ...dividends.map((d) => ({
          sql: `INSERT INTO investment_transactions (date, ticker, asset_type, operation, total_value, source_file)
            VALUES (?, ?, ?, 'D', ?, ?)`,
          args: [d.date, d.ticker, d.asset_type, d.total_value, srcFile],
        })),
      ], 'write')
    }

    // Classificar ativos por status
    const removedTickers = [...beforeSet].filter((t) => !importedSet.has(t))
    const removedResult = await db.execute({
      sql: `SELECT ticker, asset_type FROM investment_positions WHERE ticker IN (${removedTickers.map(() => '?').join(',') || "''"})`,
      args: removedTickers,
    })

    const tickers = [
      ...positions.map((p) => ({
        ticker: p.ticker,
        asset_type: p.asset_type as AssetType,
        status: beforeSet.has(p.ticker) ? 'updated' as const : 'added' as const,
      })),
      ...(removedTickers.length
        ? (removedResult.rows as unknown as { ticker: string; asset_type: string }[]).map((r) => ({
            ticker: r.ticker,
            asset_type: r.asset_type as AssetType,
            status: 'removed' as const,
          }))
        : []),
    ]

    return NextResponse.json({
      imported: positions.length,
      positions: positions.length,
      dividends: dividends.length,
      filename: file.name,
      format: 'posicao_detalhada',
      month: patrimonio?.month ?? null,
      tickers,
    })
  }

  // ── Extrato da Conta XP (proventos/dividendos) ─────────────────────────────
  if (isExtratoContaXP(buffer)) {
    const dividends = parseExtratoContaXP(buffer, file.name)

    if (!dividends.length) {
      return NextResponse.json({ error: 'Nenhum provento encontrado no extrato' }, { status: 422 })
    }

    const srcFile = `extrato_conta::${file.name}`
    await db.batch([
      { sql: 'DELETE FROM investment_transactions WHERE source_file = ?', args: [srcFile] },
      ...dividends.map((d) => ({
        sql: `INSERT INTO investment_transactions (date, ticker, asset_type, operation, total_value, source_file)
          VALUES (?, ?, ?, 'D', ?, ?)`,
        args: [d.date, d.ticker, d.asset_type, d.total_value, srcFile],
      })),
    ], 'write')

    const uniqueTickers = [...new Map(dividends.map((d) => [d.ticker, d])).values()]

    return NextResponse.json({
      imported: dividends.length,
      dividends: dividends.length,
      filename: file.name,
      format: 'extrato_conta',
      tickers: uniqueTickers.map((d) => ({
        ticker: d.ticker,
        asset_type: d.asset_type,
        status: 'added' as const,
      })),
    })
  }

  // ── Extrato de transações ───────────────────────────────────────────────────
  const parsed = parseXpFile(buffer, file.name)

  if (!parsed.length) {
    return NextResponse.json({ error: 'Nenhuma transação encontrada no arquivo' }, { status: 422 })
  }

  // Snapshot antes
  const beforeTxResult = await db.execute({ sql: 'SELECT ticker, asset_type FROM investment_positions WHERE quantity > 0', args: [] })
  const beforeTxSet = new Set((beforeTxResult.rows as unknown as { ticker: string }[]).map((r) => r.ticker))

  await db.batch(
    parsed.map((tx) => ({
      sql: `INSERT INTO investment_transactions
        (date, ticker, asset_type, operation, quantity, unit_price, total_value, source_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tx.date, tx.ticker, tx.asset_type, tx.operation,
        tx.quantity ?? null, tx.unit_price ?? null, tx.total_value, tx.source_file ?? null,
      ],
    })),
    'write'
  )

  const allTxsResult = await db.execute({
    sql: 'SELECT * FROM investment_transactions ORDER BY date ASC, id ASC',
    args: [],
  })
  const allTxs = allTxsResult.rows as unknown as InvestmentTransaction[]

  const positions = computePositions(allTxs)

  await db.batch([
    { sql: 'DELETE FROM investment_positions WHERE quantity = 0', args: [] },
    ...positions.map((pos) => ({
      sql: `INSERT INTO investment_positions (ticker, asset_type, quantity, avg_price, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(ticker) DO UPDATE SET
          asset_type = excluded.asset_type,
          quantity   = excluded.quantity,
          avg_price  = excluded.avg_price,
          updated_at = excluded.updated_at`,
      args: [pos.ticker, pos.asset_type, pos.quantity, pos.avg_price],
    })),
  ], 'write')

  const affectedMonths = [...new Set(parsed.map((t) => parseMonthKey(t.date)))]
  await updatePatrimonioSnapshots(affectedMonths)

  const afterTxSet = new Set(positions.map((p) => p.ticker))
  const parsedTickerMap = new Map(parsed.map((t) => [t.ticker, t.asset_type]))

  const tickers = [
    ...positions.map((p) => ({
      ticker: p.ticker,
      asset_type: p.asset_type as AssetType,
      status: beforeTxSet.has(p.ticker) ? 'updated' as const : 'added' as const,
    })),
    ...[...beforeTxSet]
      .filter((t) => !afterTxSet.has(t) && parsedTickerMap.has(t))
      .map((t) => ({
        ticker: t,
        asset_type: (parsedTickerMap.get(t) ?? 'acoes') as AssetType,
        status: 'removed' as const,
      })),
  ]

  return NextResponse.json({
    imported: parsed.length,
    positions: positions.length,
    filename: file.name,
    format: 'transacoes',
    tickers,
  })
}

async function updatePatrimonioSnapshots(months: string[]) {
  for (const month of months.sort()) {
    const txsResult = await db.execute({
      sql: "SELECT * FROM investment_transactions WHERE date <= ? AND date >= '2000-01-01' ORDER BY date ASC, id ASC",
      args: [`${month}-31`],
    })
    const txsUntil = txsResult.rows as unknown as InvestmentTransaction[]

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

    await db.execute({
      sql: `INSERT INTO patrimonio_snapshots (month, total_value, acoes_value, fii_value, renda_fixa_value, cripto_value, dolar_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(month) DO UPDATE SET
          total_value      = excluded.total_value,
          acoes_value      = excluded.acoes_value,
          fii_value        = excluded.fii_value,
          renda_fixa_value = excluded.renda_fixa_value,
          cripto_value     = excluded.cripto_value,
          dolar_value      = excluded.dolar_value,
          captured_at      = datetime('now')`,
      args: [month, total, acoes, fii, renda_fixa, cripto, dolar],
    })
  }
}

export async function GET() {
  // Return upload history (distinct source files)
  const result = await db.execute({
    sql: `SELECT source_file, MIN(date) as first_date, MAX(date) as last_date,
           COUNT(*) as tx_count, MAX(created_at) as uploaded_at
    FROM investment_transactions
    WHERE source_file IS NOT NULL
    GROUP BY source_file
    ORDER BY uploaded_at DESC`,
    args: [],
  })

  return NextResponse.json(result.rows)
}

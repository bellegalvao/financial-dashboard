import db from './db'
import { fetchBtcPriceBRL, fetchUsdPriceBRL } from './crypto'
import type { AssetType } from './types'

// Recalcula o snapshot de patrimônio dos meses informados a partir do estado
// atual de investment_positions — a fonte única que já mescla posições
// importadas da XP (Posição Detalhada) com lançamentos manuais/transações.
// Reconstruir por mês a partir de investment_transactions não funciona porque
// a maior parte das posições (ações, FIIs, a maioria da renda fixa) nunca
// passa pelo livro-razão de transações: elas chegam direto via upload da XP.
export async function updatePatrimonioSnapshots(months: string[]) {
  if (!months.length) return

  const positionsResult = await db.execute({
    sql: 'SELECT asset_type, quantity, avg_price FROM investment_positions WHERE quantity > 0',
    args: [],
  })
  const positions = positionsResult.rows as unknown as { asset_type: AssetType; quantity: number; avg_price: number }[]

  const hasCripto = positions.some((p) => p.asset_type === 'cripto')
  const hasDolar  = positions.some((p) => p.asset_type === 'dolar')

  const [btcPrice, usdPrice] = await Promise.all([
    hasCripto ? fetchBtcPriceBRL() : Promise.resolve(null),
    hasDolar  ? fetchUsdPriceBRL() : Promise.resolve(null),
  ])

  let total = 0, acoes = 0, fii = 0, renda_fixa = 0, cripto = 0, dolar = 0
  for (const pos of positions) {
    let price = pos.avg_price
    if (pos.asset_type === 'cripto' && btcPrice) price = btcPrice
    if (pos.asset_type === 'dolar'  && usdPrice) price = usdPrice
    const val = pos.quantity * price
    total += val
    if (pos.asset_type === 'acoes')           acoes      += val
    else if (pos.asset_type === 'fii')        fii        += val
    else if (pos.asset_type === 'renda_fixa') renda_fixa += val
    else if (pos.asset_type === 'cripto')     cripto     += val
    else if (pos.asset_type === 'dolar')      dolar      += val
  }

  await db.batch(
    months.map((month) => ({
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
    })),
    'write'
  )
}

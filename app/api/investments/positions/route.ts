import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { fetchBtcPriceBRL, fetchUsdPriceBRL } from '@/lib/crypto'
import type { InvestmentPosition } from '@/lib/types'

export async function GET() {
  const positions = db.prepare(
    'SELECT * FROM investment_positions WHERE quantity > 0 ORDER BY asset_type, ticker'
  ).all() as InvestmentPosition[]

  const hasCripto = positions.some((p) => p.asset_type === 'cripto')
  const hasDolar  = positions.some((p) => p.asset_type === 'dolar')

  const [btcPrice, usdPrice] = await Promise.all([
    hasCripto ? fetchBtcPriceBRL() : Promise.resolve(null),
    hasDolar  ? fetchUsdPriceBRL() : Promise.resolve(null),
  ])

  const enriched = positions.map((pos) => {
    let livePrice: number | null = null
    if (pos.asset_type === 'cripto' && btcPrice) livePrice = btcPrice
    if (pos.asset_type === 'dolar'  && usdPrice) livePrice = usdPrice

    const marketPrice   = livePrice ?? pos.avg_price
    const current_value = pos.quantity * marketPrice
    return { ...pos, current_price: livePrice, current_value, portfolio_pct: 0 }
  })

  const total = enriched.reduce((s, p) => s + p.current_value, 0)
  enriched.forEach((p) => {
    p.portfolio_pct = total > 0 ? (p.current_value / total) * 100 : 0
  })

  return NextResponse.json({ positions: enriched, total })
}

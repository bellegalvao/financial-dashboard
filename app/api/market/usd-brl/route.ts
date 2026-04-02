import { NextResponse } from 'next/server'
import { fetchUsdPriceBRL } from '@/lib/crypto'

export async function GET() {
  const price = await fetchUsdPriceBRL()
  if (price === null) {
    return NextResponse.json({ error: 'Não foi possível obter a cotação do dólar' }, { status: 502 })
  }
  return NextResponse.json({ usd_brl: price })
}

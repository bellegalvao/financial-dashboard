import { NextResponse } from 'next/server'
import { fetchBtcPriceBRL } from '@/lib/crypto'

export async function GET() {
  const price = await fetchBtcPriceBRL()
  if (price === null) {
    return NextResponse.json({ error: 'Não foi possível obter o preço do Bitcoin' }, { status: 502 })
  }
  return NextResponse.json({ btc_brl: price })
}

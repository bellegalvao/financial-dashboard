import { unstable_cache } from 'next/cache'

export const fetchBtcPriceBRL = unstable_cache(
  async (): Promise<number | null> => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl'
      )
      if (!res.ok) return null
      const data = await res.json()
      return data?.bitcoin?.brl ?? null
    } catch {
      return null
    }
  },
  ['btc-price-brl'],
  { revalidate: 60 }
)

export const fetchUsdPriceBRL = unstable_cache(
  async (): Promise<number | null> => {
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=BRL')
      if (!res.ok) return null
      const data = await res.json()
      return data?.rates?.BRL ?? null
    } catch {
      return null
    }
  },
  ['usd-price-brl'],
  { revalidate: 60 }
)

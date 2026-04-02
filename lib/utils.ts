import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { InvestmentTransaction, InvestmentPosition, AssetType } from './types'
import { ETF_TICKERS } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Formatação ───────────────────────────────────────────────────────────────

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// ─── Datas / Meses ────────────────────────────────────────────────────────────

/** '2025-01-15' → '2025-01' */
export function parseMonthKey(date: string): string {
  return date.slice(0, 7)
}

/** '2025-01' → 'JAN/25' */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']
  return `${months[parseInt(month, 10) - 1]}/${year.slice(2)}`
}

/** Returns current month key 'YYYY-MM' */
export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

/** 'YYYY-MM' → previous month 'YYYY-MM' */
export function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 'YYYY-MM' → next month 'YYYY-MM' */
export function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Inferência de tipo de ativo (XP parser helper) ───────────────────────────

export function inferAssetType(ticker: string): AssetType {
  const t = ticker.trim().toUpperCase()
  if (t.startsWith('TESOURO') || /^(LCI|LCA|CDB|DEBENTURE)/i.test(t)) return 'renda_fixa'
  if (/^(BTC|ETH|USDT|USDC|SOL|ADA|DOT)$/i.test(t)) return 'cripto'
  if (t.endsWith('11') && !ETF_TICKERS.includes(t)) return 'fii'
  return 'acoes'
}

// ─── Cálculo de posições (FIFO / preço médio ponderado) ───────────────────────

export function computePositions(
  transactions: Pick<InvestmentTransaction, 'ticker' | 'asset_type' | 'operation' | 'quantity' | 'unit_price' | 'total_value'>[]
): Omit<InvestmentPosition, 'id' | 'updated_at'>[] {
  const map = new Map<string, { asset_type: AssetType; qty: number; total_cost: number }>()

  for (const tx of transactions) {
    if (tx.operation === 'D') continue   // dividendo: não afeta posição
    const key = tx.ticker
    const qty = tx.quantity ?? 0
    const price = tx.unit_price ?? (qty > 0 ? tx.total_value / qty : 0)

    if (!map.has(key)) {
      map.set(key, { asset_type: tx.asset_type as AssetType, qty: 0, total_cost: 0 })
    }
    const pos = map.get(key)!

    if (tx.operation === 'C') {
      pos.total_cost += qty * price
      pos.qty += qty
    } else if (tx.operation === 'V') {
      const sellRatio = qty / Math.max(pos.qty, qty)
      pos.total_cost -= pos.total_cost * sellRatio
      pos.qty = Math.max(0, pos.qty - qty)
      if (pos.qty === 0) pos.total_cost = 0
    }
  }

  return Array.from(map.entries())
    .filter(([, pos]) => pos.qty > 0)
    .map(([ticker, pos]) => ({
      ticker,
      asset_type: pos.asset_type,
      quantity:   pos.qty,
      avg_price:  pos.qty > 0 ? pos.total_cost / pos.qty : 0,
      subtype:    null as import('./types').RendaFixaSubtype,
    }))
}

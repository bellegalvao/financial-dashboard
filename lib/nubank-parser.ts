import type { TransactionInput } from './types'
import type { XpCreditRow } from './xp-credit-parser'

export function parseNubankCSV(text: string): XpCreditRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  // Skip header: date,title,amount
  const dataLines = lines.slice(1)

  const rows: XpCreditRow[] = []

  for (const line of dataLines) {
    // Title may contain commas — split on first and last comma
    const firstComma = line.indexOf(',')
    const lastComma  = line.lastIndexOf(',')
    if (firstComma === -1 || firstComma === lastComma) continue

    const rawDate  = line.slice(0, firstComma).trim()
    const rawDesc  = line.slice(firstComma + 1, lastComma).trim()
    const rawValue = line.slice(lastComma + 1).trim()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) continue

    const value = parseFloat(rawValue)
    // Skip payments (negative = credit) and zero-value rows
    if (isNaN(value) || value <= 0) continue

    rows.push({
      date: rawDate,
      description: rawDesc,
      value,
      installment_current: null,
      installment_total: null,
      type: 'saida',
    })
  }

  return rows
}

export function nubankRowToTransactionInput(
  row: XpCreditRow,
  category: string
): TransactionInput {
  return {
    date: row.date,
    value: row.value,
    payment_method: 'credito',
    category,
    type: 'saida',
    description: row.description,
  }
}

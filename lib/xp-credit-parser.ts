import type { TransactionInput } from './types'

interface ParsedRow {
  date: string
  description: string
  value: number
  installment_current: number | null
  installment_total: number | null
  type: 'saida' | 'parcelado'
}

function parseBRL(raw: string): number {
  return parseFloat(
    raw.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim()
  )
}

function parseBrDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function parseInstallment(raw: string): { current: number | null; total: number | null } {
  // "1 de 3" → current=1, total=3
  const m = raw.trim().match(/^(\d+)\s+de\s+(\d+)$/)
  if (m) return { current: parseInt(m[1]), total: parseInt(m[2]) }
  return { current: null, total: null }
}

export function parseXpCreditCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  // Skip header row
  const dataLines = lines.slice(1)

  const rows: ParsedRow[] = []

  for (const line of dataLines) {
    // Split on semicolon — 5 columns: Data;Estabelecimento;Portador;Valor;Parcela
    const cols = line.split(';')
    if (cols.length < 4) continue

    const rawDate   = cols[0]?.trim() ?? ''
    const rawDesc   = cols[1]?.trim() ?? ''
    const rawValue  = cols[3]?.trim() ?? ''
    const rawParc   = cols[4]?.trim() ?? ''

    const date = parseBrDate(rawDate)
    if (!date) continue

    const value = parseBRL(rawValue)
    // Skip payments (negative values) and zero-value rows
    if (isNaN(value) || value <= 0) continue

    const { current, total } = parseInstallment(rawParc)
    const isInstallment = current !== null && total !== null

    rows.push({
      date,
      description: rawDesc,
      value,
      installment_current: current,
      installment_total: total,
      type: isInstallment ? 'parcelado' : 'saida',
    })
  }

  return rows
}

export function xpRowToTransactionInput(
  row: ParsedRow,
  category: string
): TransactionInput {
  return {
    date: row.date,
    value: row.value,
    payment_method: 'credito',
    category,
    type: row.type,
    description: row.description,
    installment_current: row.installment_current ?? undefined,
    installment_total: row.installment_total ?? undefined,
  }
}

export type { ParsedRow as XpCreditRow }

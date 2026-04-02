import * as XLSX from 'xlsx'
import type { InvestmentTransactionInput, AssetType } from './types'
import { inferAssetType } from './utils'

// ─── PosicaoDetalhada (snapshot de posição da XP) ─────────────────────────────

export type RendaFixaSubtype = 'prefixado' | 'pos_fixado' | 'inflacao' | null

export interface PositionSnapshot {
  ticker: string
  asset_type: AssetType
  quantity: number
  avg_price: number
  subtype: RendaFixaSubtype
}

export interface PatrimonioData {
  month: string
  total_value: number
  acoes_value: number
  fii_value: number
  renda_fixa_value: number
  cripto_value: number
}

export interface PosicaoDetalhadaResult {
  positions: PositionSnapshot[]
  patrimonio: PatrimonioData | null
  dividends: InvestmentTransactionInput[]
}

/** Detects whether a buffer is a XP PosicaoDetalhada file */
export function isPosicaoDetalhada(buffer: Buffer): boolean {
  const wb = XLSX.read(buffer, { type: 'buffer', sheetRows: 5 })
  if (wb.SheetNames[0] === 'Sua carteira') return true
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]
  return rows.slice(0, 5).some((r) =>
    r.some((c) => String(c).toLowerCase().includes('patrimônio') || String(c).toLowerCase().includes('patrimonio'))
  )
}

/** Parses R$ formatted values: "R$ 3.589,02" → 3589.02 */
function parseBRL(raw: unknown): number {
  const str = String(raw ?? '')
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  return parseFloat(str) || 0
}

type SectionType = 'fii' | 'fundos' | 'renda_fixa' | 'acoes' | null

const SECTION_MAP: Record<string, SectionType> = {
  'fundos imobiliários':  'fii',
  'fundos de investimentos': 'fundos',
  'renda fixa':           'renda_fixa',
  'ações':                'acoes',
}

const SKIP_SECTIONS = new Set([
  'custódia remunerada',
])

export function parsePosicaoDetalhada(buffer: Buffer): PosicaoDetalhadaResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]

  const positions: PositionSnapshot[] = []
  const dividends: InvestmentTransactionInput[] = []
  let section: SectionType = null
  let inDividends = false
  let skip = false
  let currentSubtype: RendaFixaSubtype = null

  // Totals for patrimônio snapshot
  let fii_value = 0, fundos_value = 0, renda_fixa_value = 0, acoes_value = 0
  let month = ''

  // Extract date from row 0 col[5]: "Conta: 6684289 | 31/03/2026, 17:05"
  const dateMatch = String(rows[0]?.[5] ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (dateMatch) month = `${dateMatch[3]}-${dateMatch[2]}`

  function detectSubtype(label: string): RendaFixaSubtype {
    const l = label.toLowerCase()
    if (l.includes('pós-fixado') || l.includes('pos-fixado') || l.includes('pós fixado') || l.includes('cdi')) return 'pos_fixado'
    if (l.includes('inflação') || l.includes('inflacao') || l.includes('ipca') || l.includes('ipc-a')) return 'inflacao'
    if (l.includes('prefixado')) return 'prefixado'
    return null
  }

  for (const row of rows) {
    const col0 = String(row[0] ?? '').trim()
    const col1 = String(row[1] ?? '').trim()
    if (!col0 || col0 === ' ') continue

    const col0Lower = col0.toLowerCase()

    // Detect skip sections
    if (SKIP_SECTIONS.has(col0Lower)) { skip = true; inDividends = false; continue }

    // Detect dividends section
    if (col0Lower === 'dividendos, proventos e outras distribuições') {
      inDividends = true; section = null; skip = false; continue
    }
    if (col0Lower === 'proventos') continue  // sub-heading inside dividends

    // Detect major section headers (only when not in dividends section)
    if (!inDividends && col0Lower in SECTION_MAP) {
      skip = false
      section = SECTION_MAP[col0Lower]
      currentSubtype = null
      // Capture section total from col[6]
      const total = parseBRL(row[6])
      if (section === 'fii')        fii_value        += total
      if (section === 'fundos')     fundos_value     += total
      if (section === 'renda_fixa') renda_fixa_value += total
      if (section === 'acoes')      acoes_value      += total
      continue
    }

    // ── Dividendos provisionados ──────────────────────────────────────────────
    if (inDividends) {
      // Sub-section header inside dividends (e.g. "0% | Renda Variável Brasil") — skip
      if (col0.includes('|')) continue
      // Data row: col[3] = valor bruto (R$), col[6] = data pagamento (DD/MM/YYYY)
      const grossVal = String(row[3] ?? '').trim()
      const payDate  = String(row[6] ?? '').trim()
      if (!grossVal.startsWith('R$') || !payDate) continue

      const parsedDate = parseBrDate(payDate)
      if (!parsedDate) continue

      const total_value = parseBRL(row[4] ?? row[3])  // prefer net value
      if (!total_value) continue

      dividends.push({
        date:       parsedDate,
        ticker:     col0.toUpperCase(),
        asset_type: inferAssetType(col0),
        operation:  'D',
        total_value,
      })
      continue
    }

    if (skip || !section) continue

    // Sub-section headers (e.g. "21,8% | Prefixado") — extract subtype
    if (col0.includes('|')) {
      const afterPipe = col0.split('|').slice(1).join('|')
      currentSubtype = detectSubtype(afterPipe)
      continue
    }

    // Data rows: col[1] must start with "R$"
    if (!col1.startsWith('R$')) continue

    const positionValue = parseBRL(col1)

    if (section === 'fii') {
      // col[5]=preço médio, col[7]=quantidade
      const avgPrice = parseBRL(row[5])
      const qty      = parseFloat(String(row[7] ?? '')) || 0
      if (!col0 || qty <= 0) continue
      positions.push({ ticker: col0.toUpperCase(), asset_type: 'fii', quantity: qty, avg_price: avgPrice, subtype: null })
    }

    else if (section === 'acoes') {
      // col[4]=preço médio, col[6]=quantidade
      const avgPrice = parseBRL(row[4])
      const qty      = parseFloat(String(row[6] ?? '')) || 0
      if (!col0 || qty <= 0) continue
      const asset_type = inferAssetType(col0)
      positions.push({ ticker: col0.toUpperCase(), asset_type, quantity: qty, avg_price: avgPrice, subtype: null })
    }

    else if (section === 'renda_fixa') {
      // col[8]=quantidade, col[9]=preço unitário
      const qty      = parseFloat(String(row[8] ?? '')) || 0
      const avgPrice = parseBRL(row[9])
      if (!col0) continue
      const price = avgPrice > 0 ? avgPrice : (qty > 0 ? positionValue / qty : positionValue)
      const finalQty = qty > 0 ? qty : 1
      positions.push({ ticker: col0, asset_type: 'renda_fixa', quantity: finalQty, avg_price: price, subtype: currentSubtype })
    }

    else if (section === 'fundos') {
      if (!col0) continue
      positions.push({ ticker: col0, asset_type: 'renda_fixa', quantity: 1, avg_price: positionValue, subtype: currentSubtype })
    }
  }

  const total_value = fii_value + fundos_value + renda_fixa_value + acoes_value
  const patrimonio: PatrimonioData | null = month ? {
    month,
    total_value,
    acoes_value,
    fii_value,
    renda_fixa_value: renda_fixa_value + fundos_value,
    cripto_value: 0,
  } : null

  return { positions, patrimonio, dividends }
}

/**
 * Parses an XP extrato file (xlsx or csv) into InvestmentTransactionInput[].
 *
 * XP typically exports columns like:
 *   Data | Ticker / Ativo | Operação (C/V) | Quantidade | Preço Unitário | Valor Total
 *
 * Column names vary slightly between exports, so we do fuzzy header matching.
 */
export function parseXpFile(buffer: Buffer, filename: string): InvestmentTransactionInput[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Convert to array of arrays
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (rows.length < 2) return []

  // Find header row (first row with at least 4 non-empty cells)
  let headerRow = 0
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const filled = (rows[i] as unknown[]).filter((c) => String(c).trim().length > 0).length
    if (filled >= 4) { headerRow = i; break }
  }

  const headers = (rows[headerRow] as unknown[]).map((h) => String(h).trim().toLowerCase())

  // Fuzzy column index finder
  function findCol(keywords: string[]): number {
    for (const kw of keywords) {
      const idx = headers.findIndex((h) => h.includes(kw))
      if (idx >= 0) return idx
    }
    return -1
  }

  const colDate  = findCol(['data', 'date'])
  const colTicker= findCol(['ticker', 'ativo', 'papel', 'código', 'codigo', 'product'])
  const colOp    = findCol(['operação', 'operacao', 'op', 'tipo', 'type', 'side'])
  const colQty   = findCol(['quantidade', 'qtd', 'qty', 'quantity'])
  const colPrice = findCol(['preço unit', 'preco unit', 'unit price', 'price'])
  const colTotal = findCol(['valor', 'total', 'amount', 'financeiro'])

  const results: InvestmentTransactionInput[] = []

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row || row.every((c) => String(c).trim() === '')) continue

    const rawDate   = colDate   >= 0 ? row[colDate]   : null
    const rawTicker = colTicker >= 0 ? row[colTicker] : null
    const rawOp     = colOp     >= 0 ? row[colOp]     : null
    const rawQty    = colQty    >= 0 ? row[colQty]    : null
    const rawPrice  = colPrice  >= 0 ? row[colPrice]  : null
    const rawTotal  = colTotal  >= 0 ? row[colTotal]  : null

    const ticker = String(rawTicker ?? '').trim().toUpperCase()
    if (!ticker) continue

    // Parse date
    let date = ''
    if (rawDate instanceof Date) {
      date = rawDate.toISOString().slice(0, 10)
    } else {
      const parsed = parseBrDate(String(rawDate ?? ''))
      if (!parsed) continue
      date = parsed
    }

    // Parse operation
    const opRaw = String(rawOp ?? '').trim().toUpperCase()
    let operation: 'C' | 'V' | 'D' = 'C'
    if (opRaw.startsWith('V') || opRaw === 'VENDA' || opRaw === 'SELL') operation = 'V'
    else if (opRaw.startsWith('D') || opRaw.includes('DIVID') || opRaw.includes('REND') || opRaw.includes('JCP')) operation = 'D'
    else operation = 'C'

    const quantity   = rawQty    ? parseFloat(String(rawQty).replace(',', '.'))   : undefined
    const unit_price = rawPrice  ? parseFloat(String(rawPrice).replace(',', '.')) : undefined
    const total_raw  = rawTotal  ? parseFloat(String(rawTotal).replace(/[^0-9.,-]/g, '').replace(',', '.')) : 0
    const total_value = Math.abs(total_raw)

    if (!total_value && !quantity) continue

    results.push({
      date,
      ticker,
      asset_type: inferAssetType(ticker),
      operation,
      quantity,
      unit_price,
      total_value,
      source_file: filename,
    })
  }

  return results
}

/** Parses Brazilian dates: DD/MM/YYYY or DD/MM/YY */
function parseBrDate(raw: string): string | null {
  if (!raw) return null
  // Try DD/MM/YYYY or DD/MM/YY
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (m) {
    const day   = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year  = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${year}-${month}-${day}`
  }
  // Try YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return null
}

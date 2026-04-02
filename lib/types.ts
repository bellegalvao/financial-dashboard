// ─── Transactions ─────────────────────────────────────────────────────────────

export type PaymentMethod = 'debito_pix' | 'credito' | 'caju'

export type TransactionType =
  | 'entrada'
  | 'saida'
  | 'investimento'
  | 'conta_fixa'
  | 'parcelado'

export interface Transaction {
  id: number
  date: string            // 'YYYY-MM-DD'
  value: number
  payment_method: PaymentMethod
  category: string
  type: TransactionType
  description: string | null
  month: string           // 'YYYY-MM'
  installment_total: number | null
  installment_current: number | null
  created_at: string
}

export interface TransactionInput {
  date: string
  value: number
  payment_method: PaymentMethod
  category: string
  type: TransactionType
  description?: string
  installment_total?: number
  installment_current?: number
}

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoryType = 'expense' | 'income' | 'investment'

export interface Category {
  id: number
  name: string
  type: CategoryType
  color: string | null
  active: number
}

export interface CategoryBudget {
  id: number
  category: string
  month: string
  budget: number
}

export interface CategoryWithBudget extends Category {
  budget: number
  real: number
  count: number
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export type ChecklistSection = 'entradas' | 'contas_fixas' | 'investimento' | 'parcelados'

export interface ChecklistItem {
  id: number
  month: string
  item_name: string
  section: ChecklistSection
  expected_value: number | null
  checked: number   // 0 | 1
}

// ─── Investments ──────────────────────────────────────────────────────────────

export type AssetType = 'acoes' | 'fii' | 'renda_fixa' | 'fundo_investimento' | 'cripto' | 'dolar'

export type InvestmentOperation = 'C' | 'V' | 'D'  // Compra / Venda / Dividendo

export interface InvestmentTransaction {
  id: number
  date: string
  ticker: string
  asset_type: AssetType
  operation: InvestmentOperation
  quantity: number | null
  unit_price: number | null
  total_value: number
  source_file: string | null
  created_at: string
}

export interface InvestmentTransactionInput {
  date: string
  ticker: string
  asset_type: AssetType
  operation: InvestmentOperation
  quantity?: number
  unit_price?: number
  total_value: number
  source_file?: string
}

export type RendaFixaSubtype = 'prefixado' | 'pos_fixado' | 'inflacao' | null

export interface InvestmentPosition {
  id: number
  ticker: string
  asset_type: AssetType
  quantity: number
  avg_price: number
  subtype: RendaFixaSubtype
  updated_at: string
}

export interface PatrimonioSnapshot {
  id: number
  month: string
  total_value: number
  acoes_value: number
  fii_value: number
  renda_fixa_value: number
  cripto_value: number
  dolar_value: number
  captured_at: string
}

// ─── Summary / Aggregations ───────────────────────────────────────────────────

export interface MonthlySummary {
  month: string
  dinheiro_em_conta: number
  entradas: {
    fixas: number
    soltas: number
    total: number
  }
  saidas: {
    contas_fixas: number
    pix_debito: number
    credito: number
    caju: number
    parcelados: number
    investimento: number
    total: number
  }
  balanco: {
    contas_a_pagar: number
    proxima_fatura: number
    dinheiro_pra_entrar: number
  }
  checklist: ChecklistItem[]
  category_breakdown: CategoryWithBudget[]
}

export interface DashboardKpis {
  patrimonio_total: number
  saldo_mes: number
  total_investido_ano: number
  gastos_mes: number
  receita_mes: number
  allocation: {
    acoes: number
    fii: number
    renda_fixa: number
    cripto: number
  }
}

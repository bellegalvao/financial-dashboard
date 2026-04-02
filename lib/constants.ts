import type { CategoryType, ChecklistSection, AssetType, PaymentMethod, TransactionType } from './types'

// ─── Categorias de gasto (espelho da planilha) ────────────────────────────────

export const DEFAULT_CATEGORIES: { name: string; type: CategoryType; color: string }[] = [
  { name: 'Cartão',       type: 'expense',    color: '#ef4444' },
  { name: 'Alimentação',  type: 'expense',    color: '#f97316' },
  { name: 'TL Tech',      type: 'expense',    color: '#8b5cf6' },
  { name: 'Carro',        type: 'expense',    color: '#6b7280' },
  { name: 'Caju',         type: 'expense',    color: '#ec4899' },
  { name: 'Vôlei',        type: 'expense',    color: '#3b82f6' },
  { name: 'Celular',      type: 'expense',    color: '#14b8a6' },
  { name: 'Uber/99',      type: 'expense',    color: '#f59e0b' },
  { name: 'Outros',       type: 'expense',    color: '#9ca3af' },
  { name: 'Belledrones',  type: 'expense',    color: '#10b981' },
  { name: 'Viagem',       type: 'expense',    color: '#06b6d4' },
  { name: 'Salário',      type: 'income',     color: '#22c55e' },
  { name: 'Freelance',    type: 'income',     color: '#84cc16' },
  { name: 'Dividendos',   type: 'income',     color: '#16a34a' },
  { name: 'Ações',        type: 'investment', color: '#7c3aed' },
  { name: 'FII',          type: 'investment', color: '#a855f7' },
  { name: 'Renda Fixa',   type: 'investment', color: '#6366f1' },
  { name: 'Cripto',       type: 'investment', color: '#f59e0b' },
]

// ─── Labels de formas de pagamento ────────────────────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  debito_pix: 'Débito / Pix',
  credito:    'Crédito',
  caju:       'Caju',
}

export const PAYMENT_METHODS: PaymentMethod[] = ['debito_pix', 'credito', 'caju']

// ─── Labels de tipos de transação ─────────────────────────────────────────────

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  entrada:     'Entrada',
  saida:       'Saída',
  investimento:'Investimento',
  conta_fixa:  'Conta Fixa',
  parcelado:   'Parcelado',
}

export const TRANSACTION_TYPES: TransactionType[] = [
  'entrada', 'saida', 'investimento', 'conta_fixa', 'parcelado',
]

// ─── Labels de tipos de ativo ─────────────────────────────────────────────────

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  acoes:              'Ações',
  fii:                'FIIs',
  renda_fixa:         'Renda Fixa',
  fundo_investimento: 'Fundos de Investimentos',
  cripto:             'Cripto',
  dolar:              'Dólar',
}

export const ASSET_TYPES: AssetType[] = ['acoes', 'fii', 'renda_fixa', 'fundo_investimento', 'cripto', 'dolar']

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  acoes:              '#7c3aed',
  fii:                '#a855f7',
  renda_fixa:         '#6366f1',
  fundo_investimento: '#0ea5e9',
  cripto:             '#f59e0b',
  dolar:              '#22c55e',
}

// ─── Checklist padrão por mês ─────────────────────────────────────────────────

export interface ChecklistDefault {
  item_name: string
  section: ChecklistSection
  expected_value: number | null
}

export const CHECKLIST_DEFAULTS: ChecklistDefault[] = [
  // Entradas
  { item_name: 'Salário',          section: 'entradas',     expected_value: null },
  { item_name: 'Caju',             section: 'entradas',     expected_value: null },
  { item_name: 'Sobrou',           section: 'entradas',     expected_value: null },
  { item_name: 'Divid. / Rend.',   section: 'entradas',     expected_value: null },
  { item_name: 'Belle Drones',     section: 'entradas',     expected_value: null },
  { item_name: 'Vaga no Gympass',  section: 'entradas',     expected_value: null },
  { item_name: 'Freelance',        section: 'entradas',     expected_value: null },
  // Contas Fixas
  { item_name: 'Volei VT',         section: 'contas_fixas', expected_value: 27.27 },
  { item_name: 'NuCel',            section: 'contas_fixas', expected_value: 45.00 },
  { item_name: 'LT Tech',          section: 'contas_fixas', expected_value: null  },
  { item_name: 'Belle Drones',     section: 'contas_fixas', expected_value: 41.54 },
  { item_name: 'Belle Drones Ads', section: 'contas_fixas', expected_value: null  },
  // Investimento
  { item_name: 'Ações',            section: 'investimento', expected_value: null },
  { item_name: 'FII',              section: 'investimento', expected_value: null },
  { item_name: 'Renda Fixa',       section: 'investimento', expected_value: null },
  { item_name: 'Cripto/Dolar',     section: 'investimento', expected_value: null },
  // Parcelados (sem defaults — usuário adiciona manualmente)
]

// ─── ETFs (tratados como Ações, não FII) ─────────────────────────────────────

export const ETF_TICKERS = ['BOVA11', 'IVVB11', 'SMAL11', 'HASH11', 'GOLD11', 'DIVO11', 'XFIX11']

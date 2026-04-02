import db from './db'
import { DEFAULT_CATEGORIES } from './constants'

export async function initDb() {
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS transactions (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        date                TEXT NOT NULL,
        value               REAL NOT NULL,
        payment_method      TEXT NOT NULL,
        category            TEXT NOT NULL,
        type                TEXT NOT NULL,
        description         TEXT,
        month               TEXT NOT NULL,
        installment_total   INTEGER,
        installment_current INTEGER,
        created_at          TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_transactions_month ON transactions(month)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS categories (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT NOT NULL UNIQUE,
        type    TEXT NOT NULL,
        color   TEXT,
        active  INTEGER DEFAULT 1
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS category_budgets (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        month    TEXT NOT NULL,
        budget   REAL NOT NULL DEFAULT 0,
        UNIQUE(category, month)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS monthly_checklist (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        month          TEXT NOT NULL,
        item_name      TEXT NOT NULL,
        section        TEXT NOT NULL,
        expected_value REAL,
        checked        INTEGER DEFAULT 0,
        transaction_id INTEGER,
        UNIQUE(month, item_name)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS investment_transactions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        date        TEXT NOT NULL,
        ticker      TEXT NOT NULL,
        asset_type  TEXT NOT NULL,
        operation   TEXT NOT NULL,
        quantity    REAL,
        unit_price  REAL,
        total_value REAL NOT NULL,
        source_file TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_inv_ticker ON investment_transactions(ticker)`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_inv_date ON investment_transactions(date)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS investment_positions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker     TEXT NOT NULL UNIQUE,
        asset_type TEXT NOT NULL,
        quantity   REAL NOT NULL DEFAULT 0,
        avg_price  REAL NOT NULL DEFAULT 0,
        subtype    TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS patrimonio_snapshots (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        month            TEXT NOT NULL UNIQUE,
        total_value      REAL NOT NULL,
        acoes_value      REAL DEFAULT 0,
        fii_value        REAL DEFAULT 0,
        renda_fixa_value REAL DEFAULT 0,
        cripto_value     REAL DEFAULT 0,
        dolar_value      REAL DEFAULT 0,
        captured_at      TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
  ], 'write')

  // Migrations — ignore errors if column already exists
  for (const sql of [
    'ALTER TABLE investment_positions ADD COLUMN subtype TEXT',
    'ALTER TABLE patrimonio_snapshots ADD COLUMN dolar_value REAL DEFAULT 0',
    'ALTER TABLE monthly_checklist ADD COLUMN transaction_id INTEGER',
  ]) {
    try {
      await db.execute({ sql, args: [] })
    } catch {
      // column already exists — ignore
    }
  }

  // Seed default categories
  for (const cat of DEFAULT_CATEGORIES) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO categories (name, type, color) VALUES (?, ?, ?)',
      args: [cat.name, cat.type, cat.color],
    })
  }
}

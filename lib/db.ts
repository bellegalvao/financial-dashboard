import Database from 'better-sqlite3'
import path from 'path'
import { initDb } from './db-init'

const DB_PATH = path.join(process.cwd(), 'data', 'financial.db')

function createDb() {
  // Ensure data directory exists
  const fs = require('fs')
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initDb(db)
  return db
}

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined
}

// Singleton: reuse connection across hot reloads in dev
const db: Database.Database =
  process.env.NODE_ENV === 'production'
    ? createDb()
    : (globalThis.__db ?? (globalThis.__db = createDb()))

// In dev, always re-run initDb on the existing connection so migrations
// added after the singleton was created are applied on hot-reload.
if (process.env.NODE_ENV !== 'production') {
  initDb(db)
}

export default db

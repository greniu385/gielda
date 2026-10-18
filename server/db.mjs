// Lokalna baza danych SQLite (wbudowana w Node.js — nic nie trzeba instalować).
// Cała baza to jeden plik: server/data/gielda.db
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
  -- Użytkownicy. Hasła przechowujemy wyłącznie jako hash (scrypt + sól).
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    display_name  TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Sesje logowania: losowy token zapisywany w przeglądarce po zalogowaniu.
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Podsumowanie portfela (jeden wiersz na użytkownika).
  CREATE TABLE IF NOT EXISTS portfolios (
    user_id          INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    starting_balance REAL    NOT NULL,
    realized_pnl     REAL    NOT NULL DEFAULT 0,
    trades_count     INTEGER NOT NULL DEFAULT 0
  );

  -- Salda walut (PLN, USD, EUR…) i średni kurs zakupu każdej waluty.
  CREATE TABLE IF NOT EXISTS balances (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency  TEXT    NOT NULL,
    amount    REAL    NOT NULL,
    avg_price REAL,
    PRIMARY KEY (user_id, currency)
  );

  -- Pozycje krótkie (gra na spadek): ilość "pożyczonej" waluty, średni kurs otwarcia
  -- i zablokowany depozyt w PLN.
  CREATE TABLE IF NOT EXISTS short_positions (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency    TEXT    NOT NULL,
    amount      REAL    NOT NULL,
    entry_price REAL    NOT NULL,
    margin      REAL    NOT NULL,
    PRIMARY KEY (user_id, currency)
  );

  -- Historia transakcji: kupno, sprzedaż, otwarcie i zamknięcie pozycji krótkiej.
  CREATE TABLE IF NOT EXISTS transactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT    NOT NULL CHECK (type IN ('buy', 'sell', 'short', 'cover')),
    currency   TEXT    NOT NULL,
    amount     REAL    NOT NULL,
    rate       REAL    NOT NULL,
    total      REAL    NOT NULL,
    pnl        REAL    NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id, id DESC);
`;

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  migrateTransactionTypes(db);
  db.exec(SCHEMA);
  return db;
}

// Bazy utworzone przed dodaniem krótkiej sprzedaży pozwalały tylko na typy 'buy' i 'sell'.
// SQLite nie zmienia ograniczeń CHECK, więc przebudowujemy tabelę, zachowując dane.
function migrateTransactionTypes(db) {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'transactions'").get();
  if (!table || table.sql.includes("'cover'")) return;
  inTransaction(db, () => {
    db.exec('DROP INDEX IF EXISTS idx_transactions_user');
    db.exec('ALTER TABLE transactions RENAME TO transactions_old');
    db.exec(SCHEMA);
    db.exec('INSERT INTO transactions SELECT * FROM transactions_old');
    db.exec('DROP TABLE transactions_old');
  });
}

// Wykonuje funkcję w transakcji SQL: albo zapisze się wszystko, albo nic.
export function inTransaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

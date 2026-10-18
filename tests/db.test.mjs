import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { openDatabase } from '../server/db.mjs';

test('migracja starej bazy: zachowuje transakcje i pozwala na krótką sprzedaż', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gielda-'));
  const path = join(dir, 'old.db');
  try {
    // Baza w starym formacie (sprzed dodania krótkiej sprzedaży).
    const old = new DatabaseSync(path);
    old.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT '2026-01-01');
      CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('buy', 'sell')), currency TEXT NOT NULL, amount REAL NOT NULL,
        rate REAL NOT NULL, total REAL NOT NULL, pnl REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT '2026-01-01');
      CREATE INDEX idx_transactions_user ON transactions (user_id, id DESC);
      INSERT INTO users (email, display_name, password_hash) VALUES ('a@b.pl', 'A', 'x');
      INSERT INTO transactions (user_id, type, currency, amount, rate, total) VALUES (1, 'buy', 'USD', 10, 4, 40);
    `);
    old.close();

    const db = openDatabase(path);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n, 1);
    db.prepare(
      "INSERT INTO transactions (user_id, type, currency, amount, rate, total) VALUES (1, 'short', 'USD', 5, 4, 20)",
    ).run();
    const index = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_transactions_user'")
      .get();
    assert.ok(index, 'indeks istnieje po migracji');
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name = 'short_positions'").get());
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

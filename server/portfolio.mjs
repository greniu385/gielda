// Portfel użytkownika i transakcje zapisywane w bazie SQLite.
// Obliczenia (saldo, średni kurs, zysk) wykonuje ten sam moduł co aplikacja: src/logic/trading.js.
import { inTransaction } from './db.mjs';
import { HttpError } from './errors.mjs';
import { BASE_CURRENCY, TradeError, applyTrade, createInitialPortfolio } from '../src/logic/trading.js';
import { getCurrency } from '../src/simulation/currencies.js';

// Kurs przysłany przez aplikację nie może odbiegać od kursu bazowego bardziej niż 2×
// (symulacja trzyma kursy w okolicach kursu bazowego) — chroni przed absurdalnymi wartościami.
const MAX_RATE_DEVIATION = 2;

export function createPortfolio(db, userId) {
  const initial = createInitialPortfolio();
  db.prepare('INSERT INTO portfolios (user_id, starting_balance) VALUES (?, ?)').run(userId, initial.startingBalance);
  writeBalances(db, userId, initial);
}

// Składa portfel z tabel `portfolios` i `balances` do postaci używanej przez aplikację.
export function loadPortfolio(db, userId) {
  const summary = db.prepare('SELECT * FROM portfolios WHERE user_id = ?').get(userId);
  if (!summary) throw new HttpError(404, 'Nie znaleziono portfela.');

  const balances = {};
  const avgPrices = {};
  for (const row of db.prepare('SELECT * FROM balances WHERE user_id = ?').all(userId)) {
    balances[row.currency] = row.amount;
    if (row.avg_price !== null) avgPrices[row.currency] = row.avg_price;
  }

  return {
    balances,
    avgPrices,
    realizedPnl: summary.realized_pnl,
    tradesCount: summary.trades_count,
    startingBalance: summary.starting_balance,
  };
}

function writeBalances(db, userId, portfolio) {
  db.prepare('DELETE FROM balances WHERE user_id = ?').run(userId);
  const insert = db.prepare('INSERT INTO balances (user_id, currency, amount, avg_price) VALUES (?, ?, ?, ?)');
  for (const [currency, amount] of Object.entries(portfolio.balances)) {
    const avgPrice = currency === BASE_CURRENCY ? null : (portfolio.avgPrices[currency] ?? null);
    insert.run(userId, currency, amount, avgPrice);
  }
}

function validateOrder({ type, code, amount, rate }) {
  const currency = getCurrency(String(code));
  if (!currency) throw new HttpError(400, 'Nieznana waluta.');
  const numericRate = Number(rate);
  if (!(numericRate > currency.rate / MAX_RATE_DEVIATION && numericRate < currency.rate * MAX_RATE_DEVIATION)) {
    throw new HttpError(400, 'Nieprawidłowy kurs waluty.');
  }
  return { type, code: currency.code, amount: Number(amount), rate: numericRate };
}

// Kupno lub sprzedaż w transakcji SQL — saldo i historia zapisują się razem albo wcale.
export function executeTrade(db, userId, order) {
  const trade = validateOrder(order);

  return inTransaction(db, () => {
    let result;
    try {
      result = applyTrade(loadPortfolio(db, userId), trade);
    } catch (error) {
      if (error instanceof TradeError) throw new HttpError(400, error.message);
      throw error;
    }
    const { portfolio, transaction } = result;

    writeBalances(db, userId, portfolio);
    db.prepare('UPDATE portfolios SET realized_pnl = ?, trades_count = ? WHERE user_id = ?').run(
      portfolio.realizedPnl,
      portfolio.tradesCount,
      userId,
    );
    const { lastInsertRowid } = db
      .prepare(
        'INSERT INTO transactions (user_id, type, currency, amount, rate, total, pnl) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(userId, transaction.type, transaction.code, transaction.amount, transaction.rate, transaction.total, transaction.pnl);

    const saved = db.prepare('SELECT * FROM transactions WHERE id = ?').get(lastInsertRowid);
    return { portfolio, transaction: toPublicTransaction(saved) };
  });
}

export function listTransactions(db, userId, limit = 100) {
  return db
    .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?')
    .all(userId, limit)
    .map(toPublicTransaction);
}

// Przywraca portfel startowy i usuwa historię transakcji.
export function resetPortfolio(db, userId) {
  return inTransaction(db, () => {
    const initial = createInitialPortfolio();
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
    db.prepare('UPDATE portfolios SET starting_balance = ?, realized_pnl = 0, trades_count = 0 WHERE user_id = ?').run(
      initial.startingBalance,
      userId,
    );
    writeBalances(db, userId, initial);
    return loadPortfolio(db, userId);
  });
}

function toPublicTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    code: row.currency,
    amount: row.amount,
    rate: row.rate,
    total: row.total,
    pnl: row.pnl,
    createdAt: row.created_at,
  };
}

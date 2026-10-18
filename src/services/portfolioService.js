// Portfel i transakcje — dane przechowuje lokalna baza SQLite na serwerze.
//
// Tabele w bazie (szczegóły w server/db.mjs):
//   users         — konta użytkowników (e-mail, nazwa, hash hasła)
//   sessions      — tokeny zalogowanych sesji
//   portfolios    — podsumowanie portfela (kwota startowa, zrealizowany zysk, liczba transakcji)
//   balances      — salda walut i średni kurs zakupu
//   transactions  — historia kupna i sprzedaży
import { api } from './api';

const toTransaction = (t) => ({ ...t, createdAt: new Date(t.createdAt) });

export async function fetchPortfolio() {
  const { portfolio } = await api.get('/api/portfolio');
  return portfolio;
}

export async function fetchTransactions() {
  const { transactions } = await api.get('/api/transactions');
  return transactions.map(toTransaction);
}

// Serwer sprawdza saldo i wykonuje transakcję w bazie (kupno/sprzedaż razem z wpisem w historii).
export async function executeTrade(order) {
  const { portfolio, transaction } = await api.post('/api/trades', order);
  return { portfolio, transaction: toTransaction(transaction) };
}

export async function resetPortfolio() {
  const { portfolio } = await api.post('/api/portfolio/reset');
  return portfolio;
}

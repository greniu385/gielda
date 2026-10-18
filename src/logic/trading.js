// Logika portfela i transakcji — czyste funkcje, niezależne od bazy danych,
// dzięki czemu można je łatwo testować (patrz tests/trading.test.mjs).

import { getBidPrice } from '../simulation/marketEngine';

export const BASE_CURRENCY = 'PLN';
export const STARTING_BALANCE = 10000;

const EPSILON = 1e-9;

export class TradeError extends Error {}

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function floor2(value) {
  return Math.floor((value + EPSILON) * 100) / 100;
}

export function createInitialPortfolio() {
  return {
    balances: { [BASE_CURRENCY]: STARTING_BALANCE },
    avgPrices: {},
    realizedPnl: 0,
    tradesCount: 0,
    startingBalance: STARTING_BALANCE,
  };
}

export function getBalance(portfolio, code) {
  return portfolio?.balances?.[code] ?? 0;
}

// Maksymalna liczba jednostek waluty, którą można kupić za dostępne złotówki.
export function getMaxBuyAmount(portfolio, askPrice) {
  if (!askPrice) return 0;
  let amount = floor2(getBalance(portfolio, BASE_CURRENCY) / askPrice);
  // Zaokrąglenie kosztu do groszy może minimalnie przekroczyć saldo — korygujemy.
  while (amount > 0 && round2(amount * askPrice) > getBalance(portfolio, BASE_CURRENCY)) {
    amount = round2(amount - 0.01);
  }
  return Math.max(0, amount);
}

/**
 * Wylicza nowy stan portfela po transakcji.
 * @param portfolio aktualny portfel użytkownika
 * @param trade { type: 'buy' | 'sell', code: 'USD', amount: liczba jednostek waluty, rate: kurs w PLN }
 * @returns { portfolio, transaction }
 */
export function applyTrade(portfolio, { type, code, amount, rate }) {
  if (type !== 'buy' && type !== 'sell') throw new TradeError('Nieznany typ transakcji.');
  if (code === BASE_CURRENCY) throw new TradeError('Nie można handlować złotówkami za złotówki.');
  if (!Number.isFinite(rate) || rate <= 0) throw new TradeError('Nieprawidłowy kurs waluty.');

  const units = round2(Number(amount));
  if (!Number.isFinite(units) || units <= 0) throw new TradeError('Podaj kwotę większą od zera.');

  const balances = { ...portfolio.balances };
  const avgPrices = { ...portfolio.avgPrices };
  const pln = balances[BASE_CURRENCY] ?? 0;
  const held = balances[code] ?? 0;
  const total = round2(units * rate);
  let pnl = 0;

  if (type === 'buy') {
    if (total > pln + EPSILON) {
      throw new TradeError(`Niewystarczające środki. Potrzebujesz ${total.toFixed(2)} PLN.`);
    }
    const newHeld = round2(held + units);
    avgPrices[code] = (held * (avgPrices[code] ?? rate) + units * rate) / newHeld;
    balances[code] = newHeld;
    balances[BASE_CURRENCY] = round2(pln - total);
  } else {
    if (units > held + EPSILON) {
      throw new TradeError(`Masz tylko ${held.toFixed(2)} ${code}.`);
    }
    pnl = round2((rate - (avgPrices[code] ?? rate)) * units);
    const newHeld = round2(held - units);
    if (newHeld <= EPSILON) {
      delete balances[code];
      delete avgPrices[code];
    } else {
      balances[code] = newHeld;
    }
    balances[BASE_CURRENCY] = round2(pln + total);
  }

  return {
    portfolio: {
      ...portfolio,
      balances,
      avgPrices,
      realizedPnl: round2((portfolio.realizedPnl ?? 0) + pnl),
      tradesCount: (portfolio.tradesCount ?? 0) + 1,
    },
    transaction: { type, code, amount: units, rate, total, pnl },
  };
}

// Wartość całego portfela w PLN (waluty wyceniane po kursie sprzedaży).
export function getPortfolioValue(portfolio, quotes) {
  if (!portfolio) return 0;
  let value = getBalance(portfolio, BASE_CURRENCY);
  for (const [code, amount] of Object.entries(portfolio.balances ?? {})) {
    if (code === BASE_CURRENCY || !quotes[code]) continue;
    value += amount * getBidPrice(quotes[code]);
  }
  return value;
}

// Lista posiadanych walut z wyceną i niezrealizowanym zyskiem/stratą.
export function getHoldings(portfolio, quotes) {
  if (!portfolio) return [];
  return Object.entries(portfolio.balances ?? {})
    .filter(([code, amount]) => code !== BASE_CURRENCY && amount > 0 && quotes[code])
    .map(([code, amount]) => {
      const bid = getBidPrice(quotes[code]);
      const avgPrice = portfolio.avgPrices?.[code] ?? bid;
      const value = amount * bid;
      const cost = amount * avgPrice;
      return {
        code,
        amount,
        avgPrice,
        value,
        pnl: value - cost,
        pnlPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

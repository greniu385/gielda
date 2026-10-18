// Logika portfela i transakcji — czyste funkcje, niezależne od bazy danych,
// dzięki czemu można je łatwo testować (patrz tests/trading.test.mjs).
//
// Rodzaje transakcji:
//   buy   — kupno waluty (gra na wzrost),
//   sell  — sprzedaż posiadanej waluty,
//   short — otwarcie pozycji krótkiej (gra na spadek): "pożyczamy" walutę i sprzedajemy ją
//           po kursie sprzedaży; z salda PLN blokowany jest depozyt równy wartości pozycji,
//   cover — zamknięcie pozycji krótkiej: odkupujemy walutę po kursie kupna i oddajemy pożyczkę.
//           Wynik = (kurs otwarcia − kurs zamknięcia) × ilość — zarabiamy, gdy kurs spadł.

import { getAskPrice, getBidPrice } from '../simulation/marketEngine';

export const BASE_CURRENCY = 'PLN';
export const STARTING_BALANCE = 10000;
export const TRADE_TYPES = ['buy', 'sell', 'short', 'cover'];

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
    shorts: {},
    realizedPnl: 0,
    tradesCount: 0,
    startingBalance: STARTING_BALANCE,
  };
}

export function getBalance(portfolio, code) {
  return portfolio?.balances?.[code] ?? 0;
}

export function getShort(portfolio, code) {
  return portfolio?.shorts?.[code] ?? null;
}

// Maksymalna liczba jednostek waluty, za którą wystarczy złotówek — przy kupnie
// (cena = kurs kupna) albo przy otwarciu krótkiej pozycji (depozyt = ilość × kurs sprzedaży).
export function getMaxAffordableAmount(portfolio, price) {
  if (!price) return 0;
  const cash = getBalance(portfolio, BASE_CURRENCY);
  let amount = floor2(cash / price);
  // Zaokrąglenie kosztu do groszy może minimalnie przekroczyć saldo — korygujemy.
  while (amount > 0 && round2(amount * price) > cash) {
    amount = round2(amount - 0.01);
  }
  return Math.max(0, amount);
}

/**
 * Wylicza nowy stan portfela po transakcji.
 * @param portfolio aktualny portfel użytkownika
 * @param trade { type: 'buy' | 'sell' | 'short' | 'cover', code: 'USD', amount: liczba jednostek, rate: kurs w PLN }
 * @returns { portfolio, transaction } — `total` to kwota PLN, która wypłynęła (buy, short) lub wpłynęła (sell, cover)
 */
export function applyTrade(portfolio, { type, code, amount, rate }) {
  if (!TRADE_TYPES.includes(type)) throw new TradeError('Nieznany typ transakcji.');
  if (code === BASE_CURRENCY) throw new TradeError('Nie można handlować złotówkami za złotówki.');
  if (!Number.isFinite(rate) || rate <= 0) throw new TradeError('Nieprawidłowy kurs waluty.');

  const units = round2(Number(amount));
  if (!Number.isFinite(units) || units <= 0) throw new TradeError('Podaj kwotę większą od zera.');

  const balances = { ...portfolio.balances };
  const avgPrices = { ...portfolio.avgPrices };
  const shorts = { ...portfolio.shorts };
  const pln = balances[BASE_CURRENCY] ?? 0;
  const held = balances[code] ?? 0;
  let total = round2(units * rate);
  let pnl = 0;

  if (type === 'buy') {
    if (total > pln + EPSILON) {
      throw new TradeError(`Niewystarczające środki. Potrzebujesz ${total.toFixed(2)} PLN.`);
    }
    const newHeld = round2(held + units);
    avgPrices[code] = (held * (avgPrices[code] ?? rate) + units * rate) / newHeld;
    balances[code] = newHeld;
    balances[BASE_CURRENCY] = round2(pln - total);
  } else if (type === 'sell') {
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
  } else if (type === 'short') {
    // Depozyt zabezpieczający = wartość sprzedanej waluty.
    if (total > pln + EPSILON) {
      throw new TradeError(`Za mało środków na depozyt. Potrzebujesz ${total.toFixed(2)} PLN.`);
    }
    const position = shorts[code] ?? { amount: 0, entryPrice: rate, margin: 0 };
    const newAmount = round2(position.amount + units);
    shorts[code] = {
      amount: newAmount,
      entryPrice: (position.amount * position.entryPrice + units * rate) / newAmount,
      margin: round2(position.margin + total),
    };
    balances[BASE_CURRENCY] = round2(pln - total);
  } else {
    const position = shorts[code];
    if (!position || units > position.amount + EPSILON) {
      throw new TradeError(`Twoja krótka pozycja to tylko ${(position?.amount ?? 0).toFixed(2)} ${code}.`);
    }
    // Zamykamy część (lub całość) pozycji i odblokowujemy proporcjonalną część depozytu.
    const closesAll = units >= position.amount - EPSILON;
    const releasedMargin = closesAll ? position.margin : round2((position.margin * units) / position.amount);
    // Strata nie może przekroczyć depozytu (pozycja zostałaby wcześniej zamknięta przez "brokera").
    pnl = round2(Math.max((position.entryPrice - rate) * units, -releasedMargin));
    total = round2(releasedMargin + pnl);
    if (closesAll) {
      delete shorts[code];
    } else {
      shorts[code] = {
        amount: round2(position.amount - units),
        entryPrice: position.entryPrice,
        margin: round2(position.margin - releasedMargin),
      };
    }
    balances[BASE_CURRENCY] = round2(pln + total);
  }

  return {
    portfolio: {
      ...portfolio,
      balances,
      avgPrices,
      shorts,
      realizedPnl: round2((portfolio.realizedPnl ?? 0) + pnl),
      tradesCount: (portfolio.tradesCount ?? 0) + 1,
    },
    transaction: { type, code, amount: units, rate, total, pnl },
  };
}

// Pozycje krótkie z bieżącą wyceną (zamknięcie nastąpiłoby po kursie kupna).
export function getShortPositions(portfolio, quotes) {
  return Object.entries(portfolio?.shorts ?? {})
    .filter(([code, position]) => position.amount > 0 && quotes[code])
    .map(([code, position]) => {
      const closePrice = getAskPrice(quotes[code]);
      const pnl = Math.max((position.entryPrice - closePrice) * position.amount, -position.margin);
      return {
        code,
        ...position,
        closePrice,
        pnl,
        pnlPercent: position.margin > 0 ? (pnl / position.margin) * 100 : 0,
        value: position.margin + pnl,
      };
    })
    .sort((a, b) => b.margin - a.margin);
}

// Wartość całego portfela w PLN: gotówka + waluty (po kursie sprzedaży) + pozycje krótkie (depozyt ± wynik).
export function getPortfolioValue(portfolio, quotes) {
  if (!portfolio) return 0;
  let value = getBalance(portfolio, BASE_CURRENCY);
  for (const [code, amount] of Object.entries(portfolio.balances ?? {})) {
    if (code === BASE_CURRENCY || !quotes[code]) continue;
    value += amount * getBidPrice(quotes[code]);
  }
  for (const position of getShortPositions(portfolio, quotes)) {
    value += position.value;
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

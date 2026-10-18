import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STARTING_BALANCE,
  TradeError,
  applyTrade,
  createInitialPortfolio,
  getHoldings,
  getMaxAffordableAmount,
  getPortfolioValue,
  getShortPositions,
} from '../src/logic/trading.js';

test('nowy portfel ma saldo startowe w PLN', () => {
  const portfolio = createInitialPortfolio();
  assert.equal(portfolio.balances.PLN, STARTING_BALANCE);
  assert.equal(portfolio.tradesCount, 0);
});

test('kupno waluty pobiera złotówki i dodaje walutę', () => {
  const { portfolio, transaction } = applyTrade(createInitialPortfolio(), {
    type: 'buy',
    code: 'USD',
    amount: 100,
    rate: 3.75,
  });
  assert.equal(portfolio.balances.PLN, 9625);
  assert.equal(portfolio.balances.USD, 100);
  assert.equal(portfolio.avgPrices.USD, 3.75);
  assert.equal(transaction.total, 375);
  assert.equal(portfolio.tradesCount, 1);
});

test('średni kurs zakupu jest ważony ilością', () => {
  let { portfolio } = applyTrade(createInitialPortfolio(), { type: 'buy', code: 'EUR', amount: 100, rate: 4 });
  ({ portfolio } = applyTrade(portfolio, { type: 'buy', code: 'EUR', amount: 300, rate: 4.4 }));
  assert.equal(portfolio.balances.EUR, 400);
  assert.ok(Math.abs(portfolio.avgPrices.EUR - 4.3) < 1e-9);
});

test('sprzedaż liczy zrealizowany zysk i usuwa walutę po sprzedaży całości', () => {
  let { portfolio } = applyTrade(createInitialPortfolio(), { type: 'buy', code: 'GBP', amount: 50, rate: 5 });
  const result = applyTrade(portfolio, { type: 'sell', code: 'GBP', amount: 50, rate: 5.2 });
  portfolio = result.portfolio;
  assert.equal(result.transaction.pnl, 10);
  assert.equal(portfolio.realizedPnl, 10);
  assert.equal(portfolio.balances.GBP, undefined);
  assert.equal(portfolio.avgPrices.GBP, undefined);
  assert.equal(portfolio.balances.PLN, STARTING_BALANCE + 10);
});

test('nie można kupić za więcej niż saldo', () => {
  assert.throws(
    () => applyTrade(createInitialPortfolio(), { type: 'buy', code: 'CHF', amount: 5000, rate: 4.6 }),
    TradeError,
  );
});

test('nie można sprzedać więcej, niż się posiada', () => {
  assert.throws(
    () => applyTrade(createInitialPortfolio(), { type: 'sell', code: 'USD', amount: 1, rate: 3.7 }),
    TradeError,
  );
});

test('odrzuca kwoty ujemne, zerowe i niepoprawne', () => {
  for (const amount of [0, -5, NaN, 'abc']) {
    assert.throws(() => applyTrade(createInitialPortfolio(), { type: 'buy', code: 'USD', amount, rate: 3.7 }), TradeError);
  }
});

test('MAX kupna nigdy nie przekracza salda po zaokrągleniu', () => {
  for (const rate of [3.7123, 4.2678, 0.02491, 0.17351, 4.9]) {
    const portfolio = createInitialPortfolio();
    const max = getMaxAffordableAmount(portfolio, rate);
    assert.doesNotThrow(() => applyTrade(portfolio, { type: 'buy', code: 'USD', amount: max, rate }));
  }
});

test('wartość portfela uwzględnia waluty po kursie sprzedaży', () => {
  const { portfolio } = applyTrade(createInitialPortfolio(), { type: 'buy', code: 'USD', amount: 100, rate: 4 });
  const quotes = { USD: { mid: 4, spread: 0 } };
  assert.equal(getPortfolioValue(portfolio, quotes), STARTING_BALANCE);
  const [holding] = getHoldings(portfolio, quotes);
  assert.equal(holding.code, 'USD');
  assert.equal(holding.value, 400);
  assert.equal(holding.pnl, 0);
});

test('krótka sprzedaż: zysk, gdy kurs spadnie', () => {
  const { portfolio, transaction } = applyTrade(createInitialPortfolio(), {
    type: 'short',
    code: 'USD',
    amount: 1000,
    rate: 4,
  });
  assert.equal(transaction.total, 4000, 'depozyt = wartość pozycji');
  assert.equal(portfolio.balances.PLN, 6000);
  assert.deepEqual(portfolio.shorts.USD, { amount: 1000, entryPrice: 4, margin: 4000 });

  const closed = applyTrade(portfolio, { type: 'cover', code: 'USD', amount: 1000, rate: 3.8 });
  assert.equal(closed.transaction.pnl, 200);
  assert.equal(closed.transaction.total, 4200, 'zwrot depozytu + zysk');
  assert.equal(closed.portfolio.balances.PLN, 10200);
  assert.equal(closed.portfolio.shorts.USD, undefined);
  assert.equal(closed.portfolio.realizedPnl, 200);
});

test('krótka sprzedaż: strata, gdy kurs wzrośnie, i częściowe zamknięcie', () => {
  const { portfolio } = applyTrade(createInitialPortfolio(), { type: 'short', code: 'EUR', amount: 200, rate: 4.25 });
  const half = applyTrade(portfolio, { type: 'cover', code: 'EUR', amount: 100, rate: 4.35 });
  assert.equal(half.transaction.pnl, -10);
  assert.equal(half.portfolio.shorts.EUR.amount, 100);
  assert.equal(half.portfolio.shorts.EUR.margin, 425);
  assert.equal(half.portfolio.balances.PLN, 10000 - 850 + 425 - 10);
});

test('krótka sprzedaż: limity depozytu i zamknięcia', () => {
  assert.throws(
    () => applyTrade(createInitialPortfolio(), { type: 'short', code: 'GBP', amount: 5000, rate: 5 }),
    /Za mało środków na depozyt/,
  );
  assert.throws(
    () => applyTrade(createInitialPortfolio(), { type: 'cover', code: 'GBP', amount: 1, rate: 5 }),
    TradeError,
  );
  // Strata nie może przekroczyć depozytu.
  const { portfolio } = applyTrade(createInitialPortfolio(), { type: 'short', code: 'CHF', amount: 100, rate: 4 });
  const closed = applyTrade(portfolio, { type: 'cover', code: 'CHF', amount: 100, rate: 9 });
  assert.equal(closed.transaction.pnl, -400);
  assert.equal(closed.portfolio.balances.PLN, 9600);
});

test('wartość portfela uwzględnia pozycje krótkie', () => {
  const { portfolio } = applyTrade(createInitialPortfolio(), { type: 'short', code: 'USD', amount: 100, rate: 4 });
  const quotes = { USD: { mid: 3.5, spread: 0 } };
  const [position] = getShortPositions(portfolio, quotes);
  assert.equal(position.pnl, 50);
  assert.equal(position.value, 450);
  assert.equal(getPortfolioValue(portfolio, quotes), STARTING_BALANCE + 50);
});

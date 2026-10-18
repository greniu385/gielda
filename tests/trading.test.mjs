import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STARTING_BALANCE,
  TradeError,
  applyTrade,
  createInitialPortfolio,
  getHoldings,
  getMaxBuyAmount,
  getPortfolioValue,
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
    const max = getMaxBuyAmount(portfolio, rate);
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

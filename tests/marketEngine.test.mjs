import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CURRENCIES } from '../src/simulation/currencies.js';
import {
  HISTORY_LENGTH,
  createMarket,
  createNewsEvent,
  getAskPrice,
  getBidPrice,
  tickMarket,
} from '../src/simulation/marketEngine.js';

// Deterministyczny generator liczb losowych (mulberry32), żeby testy były powtarzalne.
function seededRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('rynek zawiera wszystkie waluty z historią z rozgrzewki', () => {
  const market = createMarket({ rng: seededRandom(1) });
  assert.equal(Object.keys(market.quotes).length, CURRENCIES.length);
  for (const quote of Object.values(market.quotes)) {
    assert.ok(quote.history.length > 10);
    assert.ok(quote.mid > 0);
  }
  assert.equal(market.tick, 0);
  assert.deepEqual(market.news, []);
});

test('kursy startowe z NBP są używane jako kursy bazowe', () => {
  const market = createMarket({ anchors: { USD: 4.1 }, source: 'nbp', rng: seededRandom(2) });
  assert.equal(market.quotes.USD.anchor, 4.1);
  assert.equal(market.source, 'nbp');
});

test('tick zwraca nowy obiekt i nie modyfikuje poprzedniego stanu', () => {
  const market = createMarket({ rng: seededRandom(3) });
  const before = market.quotes.USD.mid;
  const next = tickMarket(market, { rng: seededRandom(4) });
  assert.notEqual(next, market);
  assert.equal(market.quotes.USD.mid, before);
  assert.equal(next.tick, 1);
});

test('kursy pozostają w rozsądnym zakresie przez długą symulację', () => {
  const rng = seededRandom(5);
  let market = createMarket({ rng });
  for (let i = 0; i < 5000; i++) market = tickMarket(market, { volatility: 'wild', rng });

  for (const currency of CURRENCIES) {
    const quote = market.quotes[currency.code];
    const ratio = quote.mid / currency.rate;
    assert.ok(ratio > 0.7 && ratio < 1.3, `${currency.code} odjechał: ${ratio}`);
    assert.equal(quote.history.length, HISTORY_LENGTH);
  }
  assert.ok(market.news.length > 0, 'w burzliwym trybie powinny pojawić się wiadomości');
});

test('kurs kupna jest wyższy od kursu sprzedaży', () => {
  const market = createMarket({ rng: seededRandom(6) });
  for (const quote of Object.values(market.quotes)) {
    assert.ok(getAskPrice(quote) > quote.mid);
    assert.ok(getBidPrice(quote) < quote.mid);
  }
});

test('wiadomość o złotym wpływa na wszystkie waluty', () => {
  // Szukamy ziarna, które wylosuje wiadomość dotyczącą wszystkich walut.
  for (let seed = 0; seed < 500; seed++) {
    const event = createNewsEvent(1, seededRandom(seed));
    if (Object.keys(event.impacts).length === CURRENCIES.length) {
      assert.ok(event.sentiment === 'up' || event.sentiment === 'down');
      return;
    }
  }
  assert.fail('nie znaleziono wiadomości dotyczącej złotego');
});

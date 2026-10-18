import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRate,
  formatSignedMoney,
  parseAmount,
} from '../src/utils/format.js';

// Separatorem tysięcy i odstępem przed "zł" jest twarda spacja (nie łamie się w wierszu).
const NBSP = ' ';

test('liczby w polskim formacie: separator tysięcy i przecinek', () => {
  assert.equal(formatNumber(1234567.891), `1${NBSP}234${NBSP}567,89`);
  assert.equal(formatNumber(999.999), `1${NBSP}000,00`);
  assert.equal(formatNumber(0), '0,00');
  assert.equal(formatNumber(-1500.5), `-1${NBSP}500,50`);
  assert.equal(formatNumber(-0.001), '0,00', 'bez "-0,00"');
  assert.equal(formatNumber(12.3456, 1), '12,3');
  assert.equal(formatNumber(NaN), '—');
  assert.equal(formatNumber(Infinity), '—');
});

test('kwoty w złotówkach i walutach', () => {
  assert.equal(formatMoney(10000), `10${NBSP}000,00${NBSP}zł`);
  assert.equal(formatMoney(12.5, 'USD'), `12,50${NBSP}USD`);
  assert.equal(formatSignedMoney(25), `+25,00${NBSP}zł`);
  assert.equal(formatSignedMoney(-25), `-25,00${NBSP}zł`);
  assert.equal(formatSignedMoney(0.004), `0,00${NBSP}zł`, 'bez plusa przy zerze');
});

test('kursy: więcej miejsc po przecinku dla tanich walut', () => {
  assert.equal(formatRate(3.71234), '3,7123');
  assert.equal(formatRate(0.024891), '0,02489');
});

test('procenty ze znakiem', () => {
  assert.equal(formatPercent(1.234), '+1,23%');
  assert.equal(formatPercent(-0.5), '-0,50%');
  assert.equal(formatPercent(0), '0,00%');
  assert.equal(formatPercent(2, { sign: false }), '2,00%');
  assert.equal(formatPercent(undefined), '—');
});

test('daty', () => {
  const date = new Date(2026, 9, 5, 7, 3, 9);
  assert.equal(formatDate(date), '05.10.2026');
  assert.equal(formatDateTime(date), '05.10.2026 07:03');
  assert.equal(formatDate(date.toISOString()), '05.10.2026', 'przyjmuje też tekst ISO z bazy');
});

test('odczyt kwot wpisanych przez użytkownika', () => {
  assert.equal(parseAmount('150'), 150);
  assert.equal(parseAmount('150,50'), 150.5);
  assert.equal(parseAmount('150.50'), 150.5);
  assert.equal(parseAmount('1 250,5'), 1250.5);
  assert.equal(parseAmount(' 7 '), 7);
  for (const bad of ['', 'abc', '-5', '1,2,3', '12zł', '.']) {
    assert.ok(Number.isNaN(parseAmount(bad)), `"${bad}" powinno być odrzucone`);
  }
});

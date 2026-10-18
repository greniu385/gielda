import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../server/app.mjs';
import { openDatabase } from '../server/db.mjs';

// Serwer z bazą w pamięci (nie zapisuje nic na dysku) na losowym porcie.
let server;
let baseUrl;

before(async () => {
  const app = createApp(openDatabase(':memory:'));
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => server.close());

async function call(method, path, { body, token } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data };
}

const USER = { displayName: 'Jan', email: 'jan@test.pl', password: 'haslo123' };
let token;

test('rejestracja tworzy konto z portfelem startowym', async () => {
  const { status, data } = await call('POST', '/api/auth/register', { body: USER });
  assert.equal(status, 201);
  assert.equal(data.user.email, USER.email);
  assert.equal(data.user.password_hash, undefined, 'hash hasła nie może wyciec do aplikacji');
  token = data.token;

  const portfolio = await call('GET', '/api/portfolio', { token });
  assert.equal(portfolio.data.portfolio.balances.PLN, 10000);
});

test('nie można założyć dwóch kont na ten sam e-mail', async () => {
  const { status, data } = await call('POST', '/api/auth/register', { body: { ...USER, email: 'JAN@test.pl' } });
  assert.equal(status, 409);
  assert.match(data.error, /już istnieje/);
});

test('walidacja rejestracji', async () => {
  const { status, data } = await call('POST', '/api/auth/register', {
    body: { displayName: 'A', email: 'zly-email', password: '123' },
  });
  assert.equal(status, 400);
  assert.ok(data.error);
});

test('logowanie: poprawne i błędne hasło', async () => {
  const ok = await call('POST', '/api/auth/login', { body: { email: USER.email, password: USER.password } });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.token);

  const bad = await call('POST', '/api/auth/login', { body: { email: USER.email, password: 'zlehaslo1' } });
  assert.equal(bad.status, 401);
  assert.equal(bad.data.error, 'Nieprawidłowy e-mail lub hasło.');
});

test('bez tokenu nie ma dostępu do portfela', async () => {
  const { status } = await call('GET', '/api/portfolio');
  assert.equal(status, 401);
});

test('kupno i sprzedaż zapisują się w bazie', async () => {
  const buy = await call('POST', '/api/trades', { token, body: { type: 'buy', code: 'USD', amount: 100, rate: 3.8 } });
  assert.equal(buy.status, 201);
  assert.equal(buy.data.portfolio.balances.PLN, 9620);
  assert.equal(buy.data.portfolio.balances.USD, 100);

  const sell = await call('POST', '/api/trades', {
    token,
    body: { type: 'sell', code: 'USD', amount: 100, rate: 3.9 },
  });
  assert.equal(sell.status, 201);
  assert.equal(sell.data.transaction.pnl, 10);
  assert.equal(sell.data.portfolio.balances.USD, undefined);

  const { data } = await call('GET', '/api/transactions', { token });
  assert.deepEqual(
    data.transactions.map((t) => t.type),
    ['sell', 'buy'],
  );
});

test('serwer odrzuca transakcje bez pokrycia i z absurdalnym kursem', async () => {
  const tooMuch = await call('POST', '/api/trades', {
    token,
    body: { type: 'buy', code: 'EUR', amount: 1e6, rate: 4.3 },
  });
  assert.equal(tooMuch.status, 400);
  assert.match(tooMuch.data.error, /Niewystarczające środki/);

  const fakeRate = await call('POST', '/api/trades', {
    token,
    body: { type: 'sell', code: 'USD', amount: 1, rate: 1000 },
  });
  assert.equal(fakeRate.status, 400);

  const { data } = await call('GET', '/api/portfolio', { token });
  assert.equal(data.portfolio.tradesCount, 2, 'odrzucone transakcje nie zmieniają portfela');
});

test('gra na spadek: otwarcie i zamknięcie krótkiej pozycji', async () => {
  const open = await call('POST', '/api/trades', {
    token,
    body: { type: 'short', code: 'EUR', amount: 100, rate: 4.3 },
  });
  assert.equal(open.status, 201);
  assert.deepEqual(open.data.portfolio.shorts.EUR, { amount: 100, entryPrice: 4.3, margin: 430 });

  const portfolio = await call('GET', '/api/portfolio', { token });
  assert.equal(portfolio.data.portfolio.shorts.EUR.margin, 430, 'pozycja zapisana w bazie');

  const cover = await call('POST', '/api/trades', {
    token,
    body: { type: 'cover', code: 'EUR', amount: 100, rate: 4.2 },
  });
  assert.equal(cover.status, 201);
  assert.equal(cover.data.transaction.pnl, 10);
  assert.equal(cover.data.portfolio.shorts.EUR, undefined);

  const bad = await call('POST', '/api/trades', { token, body: { type: 'loan', code: 'EUR', amount: 1, rate: 4.2 } });
  assert.equal(bad.status, 400);
});

test('zmiana hasła', async () => {
  const wrong = await call('POST', '/api/auth/change-password', {
    token,
    body: { currentPassword: 'zle', newPassword: 'nowe12345' },
  });
  assert.equal(wrong.status, 400);

  const ok = await call('POST', '/api/auth/change-password', {
    token,
    body: { currentPassword: USER.password, newPassword: 'nowe12345' },
  });
  assert.equal(ok.status, 204);
  const login = await call('POST', '/api/auth/login', { body: { email: USER.email, password: 'nowe12345' } });
  assert.equal(login.status, 200);
});

test('reset portfela i wylogowanie', async () => {
  const reset = await call('POST', '/api/portfolio/reset', { token });
  assert.equal(reset.data.portfolio.balances.PLN, 10000);
  assert.equal(reset.data.portfolio.tradesCount, 0);
  const { data } = await call('GET', '/api/transactions', { token });
  assert.equal(data.transactions.length, 0);

  assert.equal((await call('POST', '/api/auth/logout', { token })).status, 204);
  assert.equal((await call('GET', '/api/auth/me', { token })).status, 401);
});

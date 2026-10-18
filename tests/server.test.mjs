// Dodatkowe testy serwera: bezpieczeństwo, izolacja danych użytkowników,
// odporność na błędne dane i trwałość zapisu w pliku bazy.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApp } from '../server/app.mjs';
import { openDatabase } from '../server/db.mjs';

const tempDir = mkdtempSync(join(tmpdir(), 'gielda-test-'));
const dbPath = join(tempDir, 'gielda.db');
const webDir = join(tempDir, 'web');

let db;
let server;
let baseUrl;

async function start() {
  db = openDatabase(dbPath);
  const app = createApp(db, { webDir });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${server.address().port}`;
}

async function stop() {
  await new Promise((resolve) => server.close(resolve));
  db.close();
}

before(async () => {
  // Udajemy zbudowaną stronę (npm run build:web), żeby sprawdzić jej udostępnianie.
  mkdirSync(webDir);
  writeFileSync(join(webDir, 'index.html'), '<!doctype html><title>Giełda Walut</title>');
  await start();
});

after(async () => {
  await stop();
  rmSync(tempDir, { recursive: true, force: true });
});

async function call(method, path, { body, token, raw } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, type: response.headers.get('content-type') };
}

async function register(email, displayName = 'Tester') {
  const { status, data } = await call('POST', '/api/auth/register', {
    body: { displayName, email, password: 'haslo123' },
  });
  assert.equal(status, 201, JSON.stringify(data));
  return data.token;
}

test('użytkownik widzi tylko własny portfel i historię', async () => {
  const alice = await register('alicja@test.pl', 'Alicja');
  const bob = await register('bob@test.pl', 'Bob');

  await call('POST', '/api/trades', { token: alice, body: { type: 'buy', code: 'USD', amount: 100, rate: 3.8 } });

  const bobPortfolio = await call('GET', '/api/portfolio', { token: bob });
  assert.equal(bobPortfolio.data.portfolio.balances.PLN, 10000);
  assert.equal(bobPortfolio.data.portfolio.balances.USD, undefined);
  const bobHistory = await call('GET', '/api/transactions', { token: bob });
  assert.equal(bobHistory.data.transactions.length, 0);

  const aliceHistory = await call('GET', '/api/transactions', { token: alice });
  assert.equal(aliceHistory.data.transactions.length, 1);
});

test('logowanie ignoruje wielkość liter i spacje w e-mailu', async () => {
  const { status } = await call('POST', '/api/auth/login', {
    body: { email: '  ALICJA@Test.pl ', password: 'haslo123' },
  });
  assert.equal(status, 200);
});

test('hasło nie jest zapisane w bazie jawnym tekstem', () => {
  const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('alicja@test.pl');
  assert.ok(!row.password_hash.includes('haslo123'));
  assert.match(row.password_hash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
});

test('fałszywy lub usunięty token nie daje dostępu', async () => {
  assert.equal((await call('GET', '/api/portfolio', { token: 'falszywy-token' })).status, 401);
  const token = await register('wyloguj@test.pl');
  await call('POST', '/api/auth/logout', { token });
  assert.equal((await call('GET', '/api/portfolio', { token })).status, 401);
});

test('wygasła sesja (starsza niż 30 dni) jest odrzucana', async () => {
  const token = await register('stara-sesja@test.pl');
  db.prepare("UPDATE sessions SET created_at = '2020-01-01T00:00:00.000Z' WHERE token = ?").run(token);
  const { status, data } = await call('GET', '/api/auth/me', { token });
  assert.equal(status, 401);
  assert.match(data.error, /Sesja wygasła/);
});

test('błędne dane wejściowe dają czytelny błąd, a nie awarię serwera', async () => {
  const token = await register('dane@test.pl');
  const cases = [
    { path: '/api/auth/login', raw: '{to nie jest json' },
    { path: '/api/auth/register', body: { email: 123, password: ['x'], displayName: null } },
    { path: '/api/trades', token, body: { type: 'buy', code: 'XYZ', amount: 1, rate: 1 } },
    { path: '/api/trades', token, body: { type: 'buy', code: 'USD', amount: 'dużo', rate: 3.7 } },
    { path: '/api/trades', token, body: { type: 'buy', code: 'USD', amount: -10, rate: 3.7 } },
    { path: '/api/trades', token, body: { type: 'buy', code: 'USD', amount: 10 } },
    { path: '/api/trades', token, body: {} },
  ];
  for (const c of cases) {
    const { status, data } = await call('POST', c.path, c);
    assert.equal(status, 400, `${c.path} ${c.raw ?? JSON.stringify(c.body)}`);
    assert.equal(typeof data.error, 'string');
  }
  const { data } = await call('GET', '/api/portfolio', { token });
  assert.equal(data.portfolio.tradesCount, 0, 'żadna błędna transakcja się nie zapisała');
});

test('próba SQL injection w polu e-mail nie działa', async () => {
  const { status } = await call('POST', '/api/auth/login', {
    body: { email: "' OR '1'='1' --@x.pl", password: "' OR '1'='1" },
  });
  assert.ok(status === 400 || status === 401);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0, true, 'tabela nienaruszona');
});

test('równoczesne zlecenia nie pozwalają wydać tych samych pieniędzy dwa razy', async () => {
  const token = await register('rownoczesnie@test.pl');
  // Każde zlecenie kosztuje 6000 zł, a na koncie jest 10 000 zł — przejść może tylko jedno.
  const orders = Array.from({ length: 5 }, () =>
    call('POST', '/api/trades', { token, body: { type: 'buy', code: 'EUR', amount: 1400, rate: 4.2857 } }),
  );
  const results = await Promise.all(orders);
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(results.filter((r) => r.status === 400).length, 4);
  const { data } = await call('GET', '/api/portfolio', { token });
  assert.ok(data.portfolio.balances.PLN >= 0);
});

test('reset portfela zamyka też pozycje krótkie', async () => {
  const token = await register('reset@test.pl');
  await call('POST', '/api/trades', { token, body: { type: 'short', code: 'USD', amount: 500, rate: 3.7 } });
  const { data } = await call('POST', '/api/portfolio/reset', { token });
  assert.deepEqual(data.portfolio.shorts, {});
  assert.equal(data.portfolio.balances.PLN, 10000);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM short_positions').get().n, 0);
});

test('dane przetrwają restart serwera (zapis w pliku bazy)', async () => {
  const token = await register('trwalosc@test.pl');
  await call('POST', '/api/trades', { token, body: { type: 'buy', code: 'GBP', amount: 10, rate: 4.9 } });
  await call('POST', '/api/trades', { token, body: { type: 'short', code: 'JPY', amount: 1000, rate: 0.025 } });

  await stop();
  await start();

  const login = await call('POST', '/api/auth/login', { body: { email: 'trwalosc@test.pl', password: 'haslo123' } });
  assert.equal(login.status, 200);
  const { data } = await call('GET', '/api/portfolio', { token: login.data.token });
  assert.equal(data.portfolio.balances.GBP, 10);
  assert.equal(data.portfolio.shorts.JPY.amount, 1000);
  assert.equal(data.portfolio.tradesCount, 2);
  const history = await call('GET', '/api/transactions', { token: login.data.token });
  assert.deepEqual(
    history.data.transactions.map((t) => t.type),
    ['short', 'buy'],
  );
  assert.equal((await call('GET', '/api/portfolio', { token })).status, 200, 'stara sesja nadal ważna');
});

test('serwer udostępnia zbudowaną stronę, a nieznane adresy API zwracają 404', async () => {
  const page = await call('GET', '/wallet');
  assert.equal(page.status, 200);
  assert.match(page.type, /text\/html/);
  assert.match(page.data, /Giełda Walut/);

  const missing = await call('GET', '/api/nie-ma-takiego');
  assert.equal(missing.status, 404);
  assert.match(missing.type, /application\/json/);
});

test('CORS pozwala stronie z innego portu (tryb deweloperski) łączyć się z API', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
});

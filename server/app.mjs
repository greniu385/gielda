// API serwera (Express). Aplikacja w przeglądarce komunikuje się z nim przez /api/...
import { existsSync } from 'node:fs';
import express from 'express';

import { changePassword, loginUser, logoutUser, registerUser, requireAuth, toPublicUser } from './auth.mjs';
import { HttpError } from './errors.mjs';
import { executeTrade, listTransactions, loadPortfolio, resetPortfolio } from './portfolio.mjs';

// Dane z formularzy traktujemy zawsze jako tekst.
const text = (value) => (typeof value === 'string' ? value : '');

export function createApp(db, { webDir } = {}) {
  const app = express();
  const auth = requireAuth(db);

  app.use(express.json());

  // CORS — strona w trybie deweloperskim (port 8081) łączy się z API na innym porcie.
  app.use('/api', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // ── Konto ──────────────────────────────────────────────
  app.post('/api/auth/register', (req, res) => {
    const result = registerUser(db, {
      displayName: text(req.body?.displayName),
      email: text(req.body?.email),
      password: text(req.body?.password),
    });
    res.status(201).json(result);
  });

  app.post('/api/auth/login', (req, res) => {
    res.json(loginUser(db, { email: text(req.body?.email), password: text(req.body?.password) }));
  });

  app.post('/api/auth/logout', auth, (req, res) => {
    logoutUser(db, req.token);
    res.sendStatus(204);
  });

  app.get('/api/auth/me', auth, (req, res) => res.json({ user: toPublicUser(req.user) }));

  app.post('/api/auth/change-password', auth, (req, res) => {
    changePassword(db, req.user.id, {
      currentPassword: text(req.body?.currentPassword),
      newPassword: text(req.body?.newPassword),
    });
    res.sendStatus(204);
  });

  // ── Portfel i transakcje ───────────────────────────────
  app.get('/api/portfolio', auth, (req, res) => res.json({ portfolio: loadPortfolio(db, req.user.id) }));

  app.post('/api/portfolio/reset', auth, (req, res) => res.json({ portfolio: resetPortfolio(db, req.user.id) }));

  app.get('/api/transactions', auth, (req, res) => {
    res.json({ transactions: listTransactions(db, req.user.id) });
  });

  app.post('/api/trades', auth, (req, res) => {
    const { type, code, amount, rate } = req.body ?? {};
    res.status(201).json(executeTrade(db, req.user.id, { type, code, amount, rate }));
  });

  app.use('/api', () => {
    throw new HttpError(404, 'Nie znaleziono.');
  });

  // Gotowa strona (po `npm run build:web`) — serwer udostępnia ją pod tym samym adresem.
  if (webDir && existsSync(webDir)) {
    app.use(express.static(webDir));
    app.get('/{*path}', (req, res) => res.sendFile('index.html', { root: webDir }));
  }

  // Obsługa błędów: komunikat trafia do aplikacji jako { error: "..." }.
  app.use((error, req, res, next) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Nieprawidłowe dane.' });
    console.error(error);
    res.status(500).json({ error: 'Błąd serwera.' });
  });

  return app;
}

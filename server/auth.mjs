// Rejestracja, logowanie i sesje użytkowników.
import { Buffer } from 'node:buffer';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { inTransaction } from './db.mjs';
import { createPortfolio } from './portfolio.mjs';
import { HttpError } from './errors.mjs';
import { validateDisplayName, validateEmail, validatePassword } from '../src/utils/validation.js';

const SESSION_DAYS = 30;

// Hasło zamieniamy na hash algorytmem scrypt z losową solą — w bazie nie ma haseł w jawnej postaci.
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

export function toPublicUser(row) {
  return { id: row.id, email: row.email, displayName: row.display_name, createdAt: row.created_at };
}

function createSession(db, userId) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

function assertValid(...messages) {
  const message = messages.find(Boolean);
  if (message) throw new HttpError(400, message);
}

export function registerUser(db, { displayName = '', email = '', password = '' }) {
  assertValid(validateDisplayName(displayName), validateEmail(email), validatePassword(password));

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
  if (exists) throw new HttpError(409, 'Konto z tym adresem e-mail już istnieje.');

  const passwordHash = hashPassword(password);
  // Konto, portfel startowy i sesja powstają razem (transakcja SQL) — nie zostanie konto bez portfela.
  return inTransaction(db, () => {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)')
      .run(email.trim(), displayName.trim(), passwordHash);
    const userId = Number(lastInsertRowid);
    createPortfolio(db, userId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return { token: createSession(db, userId), user: toPublicUser(user) };
  });
}

export function loginUser(db, { email = '', password = '' }) {
  assertValid(validateEmail(email), password ? null : 'Podaj hasło.');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim());
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new HttpError(401, 'Nieprawidłowy e-mail lub hasło.');
  }
  return { token: createSession(db, user.id), user: toPublicUser(user) };
}

export function logoutUser(db, token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function changePassword(db, userId, { currentPassword = '', newPassword = '' }) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!verifyPassword(currentPassword, user.password_hash)) {
    throw new HttpError(400, 'Obecne hasło jest nieprawidłowe.');
  }
  assertValid(validatePassword(newPassword));
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), userId);
}

// Middleware Express: sprawdza nagłówek "Authorization: Bearer <token>"
// i dopisuje do żądania zalogowanego użytkownika (req.user).
export function requireAuth(db) {
  const findSession = db.prepare(`
    SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)
  `);

  return (req, res, next) => {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    const user = token ? findSession.get(token, `-${SESSION_DAYS} days`) : null;
    if (!user) throw new HttpError(401, 'Sesja wygasła — zaloguj się ponownie.');
    req.user = user;
    req.token = token;
    next();
  };
}

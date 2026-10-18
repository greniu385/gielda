// Tworzy konto demonstracyjne: npm run db:seed
//   e-mail: demo@gielda.pl   hasło: demo123
import { fileURLToPath } from 'node:url';

import { registerUser } from './auth.mjs';
import { openDatabase } from './db.mjs';

const DB_PATH = process.env.DB_PATH || fileURLToPath(new URL('./data/gielda.db', import.meta.url));
const db = openDatabase(DB_PATH);

const DEMO = { displayName: 'Konto Demo', email: 'demo@gielda.pl', password: 'demo123' };

if (db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO.email)) {
  console.log(`Konto demo już istnieje: ${DEMO.email} / ${DEMO.password}`);
} else {
  registerUser(db, DEMO);
  console.log(`Utworzono konto demo: ${DEMO.email} / ${DEMO.password}`);
}

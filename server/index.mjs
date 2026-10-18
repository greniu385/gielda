// Uruchomienie serwera: npm run server
import { fileURLToPath } from 'node:url';

import { createApp } from './app.mjs';
import { openDatabase } from './db.mjs';

const PORT = Number(process.env.PORT) || 4000;
const DB_PATH = process.env.DB_PATH || fileURLToPath(new URL('./data/gielda.db', import.meta.url));
const WEB_DIR = fileURLToPath(new URL('../dist', import.meta.url));

const db = openDatabase(DB_PATH);
const app = createApp(db, { webDir: WEB_DIR });

app.listen(PORT, () => {
  console.log(`Serwer Giełdy Walut działa: http://localhost:${PORT}`);
  console.log(`Baza danych SQLite: ${DB_PATH}`);
});

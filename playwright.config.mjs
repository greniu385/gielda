// Testy end-to-end w prawdziwej przeglądarce (Playwright): npm run test:e2e
//
// Przed pierwszym uruchomieniem pobierz przeglądarkę: npx playwright install chromium
// Testy same budują stronę i uruchamiają serwer z osobną, tymczasową bazą danych
// (Twoja baza w server/data/ nie jest ruszana).
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const DB_PATH = join(tmpdir(), `gielda-e2e-${process.pid}.db`);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 2,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pl-PL',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Opcjonalnie własna przeglądarka, np. CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'komputer', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'telefon', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build:web && npm run server',
    url: `http://localhost:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: { PORT: String(PORT), DB_PATH, CI: '1' },
  },
});

import { CURRENCY_CODES } from '../simulation/currencies';

const NBP_URL = 'https://api.nbp.pl/api/exchangerates/tables/A?format=json';

// Pobiera aktualne średnie kursy walut z publicznego API Narodowego Banku Polskiego.
// Są one używane jako kursy startowe symulacji. Gdy nie ma internetu, symulacja
// startuje z wbudowanych kursów (patrz currencies.js).
export async function fetchNbpRates({ timeout = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(NBP_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`NBP HTTP ${response.status}`);
    const [table] = await response.json();

    const rates = {};
    for (const { code, mid } of table.rates) {
      if (CURRENCY_CODES.includes(code) && mid > 0) rates[code] = mid;
    }
    return { rates, date: table.effectiveDate };
  } finally {
    clearTimeout(timer);
  }
}

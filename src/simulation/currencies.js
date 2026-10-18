// Waluty dostępne na giełdzie. Wszystkie kursy są podawane w PLN za 1 jednostkę waluty.
// `rate` to kurs startowy używany, gdy nie uda się pobrać aktualnych kursów z API NBP.
// `volatility` to odchylenie standardowe zmiany kursu w jednym ticku symulacji,
// a `spread` to różnica między kursem kupna i sprzedaży (np. 0.005 = 0,5%).
export const CURRENCIES = [
  { code: 'USD', name: 'Dolar amerykański', rate: 3.72, volatility: 0.0016, spread: 0.005 },
  { code: 'EUR', name: 'Euro', rate: 4.26, volatility: 0.0009, spread: 0.004 },
  { code: 'GBP', name: 'Funt brytyjski', rate: 4.93, volatility: 0.0014, spread: 0.006 },
  { code: 'CHF', name: 'Frank szwajcarski', rate: 4.61, volatility: 0.0012, spread: 0.006 },
  { code: 'JPY', name: 'Jen japoński', rate: 0.0249, volatility: 0.0021, spread: 0.008 },
  { code: 'CAD', name: 'Dolar kanadyjski', rate: 2.69, volatility: 0.0017, spread: 0.008 },
  { code: 'NOK', name: 'Korona norweska', rate: 0.355, volatility: 0.0019, spread: 0.01 },
  { code: 'CZK', name: 'Korona czeska', rate: 0.1735, volatility: 0.0011, spread: 0.01 },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

export function getCurrency(code) {
  return CURRENCIES.find((c) => c.code === code);
}

export const DEFAULT_RATES = Object.fromEntries(CURRENCIES.map((c) => [c.code, c.rate]));

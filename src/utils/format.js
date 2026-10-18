// Formatowanie liczb i dat w polskim formacie (np. 1 234,56 zł).
// Intl.NumberFormat nie wszędzie w React Native obsługuje separatory tysięcy,
// więc formatujemy ręcznie.

function groupThousands(integerPart) {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(decimals);
  const [integer, fraction] = fixed.split('.');
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
  return sign + groupThousands(integer) + (fraction ? ',' + fraction : '');
}

export function formatMoney(value, currency = 'PLN', decimals = 2) {
  const suffix = currency === 'PLN' ? 'zł' : currency;
  return `${formatNumber(value, decimals)} ${suffix}`;
}

// Kursy małych walut (np. JPY ≈ 0,02 zł) potrzebują więcej miejsc po przecinku.
export function formatRate(rate) {
  return formatNumber(rate, rate < 0.1 ? 5 : 4);
}

export function formatPercent(value, { sign = true } = {}) {
  if (!Number.isFinite(value)) return '—';
  const prefix = sign && value > 0.0049 ? '+' : '';
  return `${prefix}${formatNumber(value, 2)}%`;
}

export function formatSignedMoney(value, currency = 'PLN') {
  const prefix = value > 0.0049 ? '+' : '';
  return prefix + formatMoney(value, currency);
}

const pad = (n) => String(n).padStart(2, '0');

export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Zamienia tekst wpisany przez użytkownika (np. "1 250,5") na liczbę.
export function parseAmount(text) {
  const normalized = String(text).replace(/\s/g, '').replace(',', '.');
  if (normalized === '' || !/^\d*\.?\d*$/.test(normalized)) return NaN;
  return Number(normalized);
}

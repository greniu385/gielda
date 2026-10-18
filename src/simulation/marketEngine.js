// Silnik symulacji rynku walutowego.
//
// Każdy kurs zmienia się w kolejnych "tickach" według modelu:
//   nowy_kurs = kurs * exp(trend + powrót_do_średniej + szum_losowy + wpływ_wiadomości)
//
// - szum losowy:          losowe wahania kursu (rozkład normalny),
// - trend:                okresowo zmieniająca się tendencja (hossa / bessa),
// - powrót do średniej:   kurs jest delikatnie przyciągany do kursu bazowego,
//                         dzięki czemu nie "ucieka" w nieskończoność,
// - wiadomości rynkowe:   losowe wydarzenia, które gwałtownie zmieniają kurs
//                         wybranych walut, a ich efekt wygasa przez kilka ticków.
//
// Wszystkie funkcje są czyste (nie mają efektów ubocznych), a generator liczb
// losowych można podmienić — dzięki temu silnik da się łatwo testować.

import { CURRENCIES } from './currencies';
import { NEWS_TEMPLATES, expandImpacts } from './news';

export const HISTORY_LENGTH = 120;
export const WARMUP_TICKS = 60;
export const MAX_NEWS = 15;

const MEAN_REVERSION = 0.01;
// Maksymalny trend na tick jako ułamek zmienności danej waluty.
const TREND_STRENGTH = 0.25;
const TREND_SWITCH_PROBABILITY = 0.02;
const BASE_NEWS_PROBABILITY = 0.035;
const IMPULSE_DECAY = 0.7;

export const VOLATILITY_MODES = {
  calm: { label: 'Spokojny', sigma: 0.5, news: 0.5 },
  normal: { label: 'Normalny', sigma: 1, news: 1 },
  wild: { label: 'Burzliwy', sigma: 2.2, news: 2.5 },
};

export const SPEEDS = {
  slow: { label: 'Wolno', interval: 3000 },
  normal: { label: 'Normalnie', interval: 1500 },
  fast: { label: 'Szybko', interval: 600 },
};

// Rozkład normalny N(0, 1) metodą Boxa-Mullera.
export function gaussian(rng = Math.random) {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randomTrend(rng, volatility) {
  return (rng() * 2 - 1) * TREND_STRENGTH * volatility;
}

function createQuote(currency, anchor, rng) {
  return {
    code: currency.code,
    anchor,
    mid: anchor,
    open: anchor,
    high: anchor,
    low: anchor,
    spread: currency.spread,
    volatility: currency.volatility,
    trend: randomTrend(rng, currency.volatility),
    impulse: 0,
    history: [anchor],
  };
}

function stepQuote(quote, { sigma, shock = 0, rng }) {
  const trend = rng() < TREND_SWITCH_PROBABILITY ? randomTrend(rng, quote.volatility * sigma) : quote.trend;
  const meanReversion = MEAN_REVERSION * Math.log(quote.anchor / quote.mid);
  const noise = quote.volatility * sigma * gaussian(rng);

  // 60% wpływu wiadomości działa od razu, reszta rozkłada się na kolejne ticki.
  const impulseNow = quote.impulse * (1 - IMPULSE_DECAY);
  const impulse = quote.impulse * IMPULSE_DECAY + shock * 0.4;

  const mid = quote.mid * Math.exp(trend + meanReversion + noise + shock * 0.6 + impulseNow);
  const history = [...quote.history, mid];
  if (history.length > HISTORY_LENGTH) history.splice(0, history.length - HISTORY_LENGTH);

  return {
    ...quote,
    mid,
    trend,
    impulse,
    high: Math.max(quote.high, mid),
    low: Math.min(quote.low, mid),
    history,
  };
}

export function createNewsEvent(tick, rng = Math.random) {
  const template = NEWS_TEMPLATES[Math.floor(rng() * NEWS_TEMPLATES.length)];
  const strength = 0.006 + rng() * 0.014;
  const directions = expandImpacts(template.impacts);
  const impacts = Object.fromEntries(
    Object.entries(directions).map(([code, direction]) => [code, direction * strength]),
  );
  const values = Object.values(impacts);
  const sentiment = values.every((v) => v > 0) ? 'up' : values.every((v) => v < 0) ? 'down' : 'mixed';

  return {
    id: `${tick}-${Math.floor(rng() * 1e9)}`,
    tick,
    timestamp: Date.now(),
    title: template.title,
    description: template.description,
    impacts,
    sentiment,
  };
}

// Wykonuje jeden krok symulacji i zwraca NOWY stan rynku.
export function tickMarket(market, { volatility = 'normal', rng = Math.random, allowNews = true } = {}) {
  const mode = VOLATILITY_MODES[volatility] ?? VOLATILITY_MODES.normal;
  const tick = market.tick + 1;

  let news = market.news;
  let shocks = {};
  if (allowNews && rng() < BASE_NEWS_PROBABILITY * mode.news) {
    const event = createNewsEvent(tick, rng);
    shocks = event.impacts;
    news = [event, ...news].slice(0, MAX_NEWS);
  }

  const quotes = {};
  for (const [code, quote] of Object.entries(market.quotes)) {
    quotes[code] = stepQuote(quote, { sigma: mode.sigma, shock: shocks[code] ?? 0, rng });
  }

  return { ...market, tick, quotes, news };
}

// Tworzy nowy rynek. `anchors` to kursy bazowe (np. z NBP). Symulacja jest
// "rozgrzewana" kilkudziesięcioma spokojnymi tickami (bez wiadomości),
// żeby wykresy od razu miały historię.
export function createMarket({ anchors = {}, source = 'offline', sourceDate = null, rng = Math.random } = {}) {
  const quotes = {};
  for (const currency of CURRENCIES) {
    quotes[currency.code] = createQuote(currency, anchors[currency.code] ?? currency.rate, rng);
  }

  let market = { tick: 0, quotes, news: [], source, sourceDate, startedAt: Date.now() };
  for (let i = 0; i < WARMUP_TICKS; i++) {
    market = tickMarket(market, { rng, allowNews: false });
  }
  return { ...market, tick: 0 };
}

// Kurs, po którym użytkownik KUPUJE walutę (wyższy).
export function getAskPrice(quote) {
  return quote.mid * (1 + quote.spread / 2);
}

// Kurs, po którym użytkownik SPRZEDAJE walutę (niższy).
export function getBidPrice(quote) {
  return quote.mid * (1 - quote.spread / 2);
}

export function getChangePercent(quote) {
  return ((quote.mid - quote.open) / quote.open) * 100;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SPEEDS, VOLATILITY_MODES, createMarket, tickMarket } from '../simulation/marketEngine';
import { fetchNbpRates } from '../services/nbpService';

const SETTINGS_KEY = 'gielda.market.settings';
const DEFAULT_SETTINGS = { speed: 'normal', volatility: 'normal', paused: false };

const MarketContext = createContext(null);

export function MarketProvider({ children }) {
  const [market, setMarket] = useState(() => createMarket());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const anchorsRef = useRef({ anchors: {}, source: 'offline', sourceDate: null });

  // Wczytanie zapisanych ustawień symulacji.
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = JSON.parse(saved);
        setSettings({
          speed: SPEEDS[parsed.speed] ? parsed.speed : DEFAULT_SETTINGS.speed,
          volatility: VOLATILITY_MODES[parsed.volatility] ? parsed.volatility : DEFAULT_SETTINGS.volatility,
          paused: Boolean(parsed.paused),
        });
      })
      .catch(() => {});
  }, []);

  // Kursy startowe z NBP — gdy się uda, sesja startuje od prawdziwych kursów.
  useEffect(() => {
    let cancelled = false;
    fetchNbpRates()
      .then(({ rates, date }) => {
        if (cancelled || Object.keys(rates).length === 0) return;
        anchorsRef.current = { anchors: rates, source: 'nbp', sourceDate: date };
        setMarket(createMarket(anchorsRef.current));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Główna pętla symulacji.
  useEffect(() => {
    if (settings.paused) return undefined;
    const id = setInterval(() => {
      setMarket((current) => tickMarket(current, { volatility: settings.volatility }));
    }, SPEEDS[settings.speed].interval);
    return () => clearInterval(id);
  }, [settings.speed, settings.paused, settings.volatility]);

  const updateSettings = useCallback((patch) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetMarket = useCallback(() => setMarket(createMarket(anchorsRef.current)), []);

  const value = useMemo(
    () => ({ market, quotes: market.quotes, news: market.news, settings, updateSettings, resetMarket }),
    [market, settings, updateSettings, resetMarket],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket musi być użyte wewnątrz MarketProvider');
  return context;
}

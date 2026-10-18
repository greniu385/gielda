import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';
import {
  ensureUserProfile,
  executeTrade,
  resetPortfolio,
  subscribeToPortfolio,
  subscribeToTransactions,
} from '../services/portfolioService';

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Nasłuchiwanie zmian portfela w czasie rzeczywistym.
  useEffect(() => {
    if (!user) return undefined;
    return subscribeToPortfolio(
      user.uid,
      (data) => {
        if (data) {
          setPortfolio(data);
          setLoading(false);
        } else {
          // Brak dokumentu (np. konto założone ręcznie w konsoli) — tworzymy portfel startowy.
          ensureUserProfile(user).catch((err) => {
            setError(err);
            setLoading(false);
          });
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeToTransactions(user.uid, setTransactions, setError);
  }, [user]);

  const trade = useCallback((order) => executeTrade(user.uid, order), [user]);
  const reset = useCallback(() => resetPortfolio(user.uid), [user]);

  const value = useMemo(
    () => ({ portfolio, transactions, loading, error, trade, reset }),
    [portfolio, transactions, loading, error, trade, reset],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio musi być użyte wewnątrz PortfolioProvider');
  return context;
}

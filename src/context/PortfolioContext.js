import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';
import { executeTrade, fetchPortfolio, fetchTransactions, resetPortfolio } from '../services/portfolioService';

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Wczytanie portfela i historii z serwera po zalogowaniu.
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    Promise.all([fetchPortfolio(), fetchTransactions()])
      .then(([nextPortfolio, nextTransactions]) => {
        if (cancelled) return;
        setPortfolio(nextPortfolio);
        setTransactions(nextTransactions);
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Po transakcji serwer odsyła nowy stan portfela i zapisaną transakcję.
  const trade = useCallback(async (order) => {
    const { portfolio: nextPortfolio, transaction } = await executeTrade(order);
    setPortfolio(nextPortfolio);
    setTransactions((list) => [transaction, ...list]);
    return transaction;
  }, []);

  const reset = useCallback(async () => {
    setPortfolio(await resetPortfolio());
    setTransactions([]);
  }, []);

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

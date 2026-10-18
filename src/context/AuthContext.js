import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loadToken, saveToken, setUnauthorizedHandler } from '../services/api';
import { checkServer, fetchCurrentUser, loginUser, logoutUser, registerUser } from '../services/authService';

const AuthContext = createContext(null);

// Sprawdza, czy serwer działa i czy zapisany token sesji jest nadal ważny.
async function restoreSession() {
  try {
    await checkServer();
  } catch {
    return { status: 'offline', user: null };
  }
  if (!(await loadToken())) return { status: 'ready', user: null };
  try {
    return { status: 'ready', user: await fetchCurrentUser() };
  } catch (error) {
    if (error.status !== 401) return { status: 'offline', user: null };
    await saveToken(null);
    return { status: 'ready', user: null };
  }
}

// status: 'loading' — sprawdzamy sesję, 'ready' — gotowe, 'offline' — serwer nie odpowiada.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    restoreSession().then((result) => {
      if (cancelled) return;
      setUser(result.user);
      setStatus(result.status);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      saveToken(null);
      setUser(null);
    });
  }, []);

  const login = useCallback(async (credentials) => setUser(await loginUser(credentials)), []);
  const register = useCallback(async (form) => setUser(await registerUser(form)), []);
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Serwer niedostępny — token i tak został usunięty z urządzenia.
    }
    setUser(null);
  }, []);
  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ user, status, initializing: status === 'loading', login, register, logout, retry }),
    [user, status, login, register, logout, retry],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth musi być użyte wewnątrz AuthProvider');
  return context;
}

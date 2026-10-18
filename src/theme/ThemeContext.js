import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkColors, lightColors } from './colors';

const STORAGE_KEY = 'gielda.theme';

const ThemeContext = createContext(null);

export function AppThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  // null = użytkownik jeszcze nie wybrał motywu, więc używamy motywu systemowego.
  const [scheme, setScheme] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'light') setScheme(saved);
      })
      .catch(() => {});
  }, []);

  const isDark = (scheme ?? systemScheme ?? 'dark') !== 'light';

  const setTheme = useCallback((next) => {
    setScheme(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme]);

  const value = useMemo(
    () => ({ isDark, colors: isDark ? darkColors : lightColors, toggleTheme, setTheme }),
    [isDark, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme musi być użyte wewnątrz AppThemeProvider');
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useResponsive } from '../hooks/useResponsive';
import { useAppTheme } from '../theme/ThemeContext';
import { NATIVE_DRIVER } from '../utils/animation';
import { fonts } from '../theme/fonts';

const ToastContext = createContext(null);

const ICONS = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' };

// Krótkie powiadomienia wysuwane z góry ekranu, np. "Kupiono 100 USD".
export function ToastProvider({ children }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useResponsive();
  const [toast, setToast] = useState(null);
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef(null);

  const showToast = useCallback(
    (message, type = 'success') => {
      clearTimeout(timer.current);
      setToast({ message, type, key: Date.now() });
      Animated.spring(anim, { toValue: 1, useNativeDriver: NATIVE_DRIVER, friction: 8 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: NATIVE_DRIVER }).start(() =>
          setToast(null),
        );
      }, 2600);
    },
    [anim],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const accent = toast?.type === 'error' ? colors.down : toast?.type === 'info' ? colors.primary : colors.up;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            isWide ? styles.toastWide : styles.toastNarrow,
            {
              pointerEvents: 'none',
              ...(isWide ? { bottom: insets.bottom + 28 } : { top: insets.top + 10 }),
              backgroundColor: colors.elevated,
              borderColor: accent,
              shadowColor: colors.shadow,
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [isWide ? 40 : -40, 0] }) },
              ],
            },
          ]}
        >
          <Ionicons name={ICONS[toast.type]} size={22} color={accent} />
          <Text style={[styles.text, { color: colors.text }]}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast musi być użyte wewnątrz ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  // Na telefonie powiadomienie wysuwa się u góry, na komputerze — w prawym dolnym rogu.
  toastNarrow: { left: 16, right: 16 },
  toastWide: { right: 28, width: 420 },
  text: { flex: 1, fontSize: 15, fontFamily: fonts.semibold },
});

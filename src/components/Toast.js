import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { NATIVE_DRIVER } from '../utils/animation';

const ToastContext = createContext(null);

const ICONS = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' };

// Krótkie powiadomienia wysuwane z góry ekranu, np. "Kupiono 100 USD".
export function ToastProvider({ children }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef(null);

  const showToast = useCallback(
    (message, type = 'success') => {
      clearTimeout(timer.current);
      setToast({ message, type, key: Date.now() });
      Animated.spring(anim, { toValue: 1, useNativeDriver: NATIVE_DRIVER, friction: 8 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: NATIVE_DRIVER }).start(() => setToast(null));
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
            {
              pointerEvents: 'none',
              top: insets.top + 10,
              backgroundColor: colors.elevated,
              borderColor: accent,
              shadowColor: colors.shadow,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
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
    left: 16,
    right: 16,
    alignSelf: 'center',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  text: { flex: 1, fontSize: 15, fontWeight: '600' },
});

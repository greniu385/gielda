import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { NATIVE_DRIVER } from '../utils/animation';

// Przycisk przełączający tryb nocny / jasny.
export default function ThemeToggle({ style }) {
  const { isDark, colors, toggleTheme } = useAppTheme();
  const [rotation] = useState(() => new Animated.Value(isDark ? 1 : 0));

  useEffect(() => {
    Animated.spring(rotation, { toValue: isDark ? 1 : 0, useNativeDriver: NATIVE_DRIVER, friction: 6 }).start();
  }, [isDark, rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Włącz tryb jasny' : 'Włącz tryb nocny'}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#C9D4FF' : '#F59E0B'} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

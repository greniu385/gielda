import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { NATIVE_DRIVER } from '../utils/animation';

const MOON_COLOR = '#C9D4FF';
const SUN_COLOR = '#F59E0B';

// Przycisk przełączający tryb nocny / jasny.
// `showLabel` — wersja z podpisami "Ciemny | Jasny" (na szerokim ekranie).
export default function ThemeToggle({ style, showLabel = false }) {
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
      style={({ pressed, hovered }) => [
        showLabel ? styles.pill : styles.button,
        {
          backgroundColor: hovered ? colors.elevated : colors.surfaceAlt,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {showLabel ? (
        <>
          <Segment active={isDark} icon="moon" label="Ciemny" iconColor={MOON_COLOR} colors={colors} />
          <Segment active={!isDark} icon="sunny" label="Jasny" iconColor={SUN_COLOR} colors={colors} />
        </>
      ) : (
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? MOON_COLOR : SUN_COLOR} />
        </Animated.View>
      )}
    </Pressable>
  );
}

function Segment({ active, icon, label, iconColor, colors }) {
  return (
    <View style={[styles.segment, active && { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={active ? icon : `${icon}-outline`} size={16} color={active ? iconColor : colors.textSubtle} />
      <Text style={[styles.segmentLabel, { color: active ? colors.text : colors.textSubtle }]}>{label}</Text>
    </View>
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
  pill: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  segmentLabel: { fontSize: 13.5, fontWeight: '700' },
});

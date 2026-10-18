import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';

// Przełącznik kilku opcji, np. Kup / Sprzedaj albo prędkość symulacji.
// `activeColors` pozwala nadać każdej opcji własny kolor (np. zielony dla "Kup").
export default function SegmentedControl({ options, value, onChange, activeColors = {}, style }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, style]}>
      {options.map((option) => {
        const active = option.value === value;
        const activeBg = activeColors[option.value] ?? colors.primary;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ hovered }) => [
              styles.segment,
              active ? { backgroundColor: activeBg } : hovered && { backgroundColor: colors.elevated },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? (activeColors[option.value] ? colors.onAccent : colors.onPrimary) : colors.textMuted,
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  label: { fontSize: 14, fontFamily: fonts.bold },
});

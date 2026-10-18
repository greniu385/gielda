import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { formatPercent } from '../utils/format';
import { fonts } from '../theme/fonts';

// Kolorowa etykieta ze zmianą procentową (zielona = wzrost, czerwona = spadek).
export default function ChangeBadge({ value, size = 'md' }) {
  const { colors } = useAppTheme();
  const positive = value >= 0;
  const fg = positive ? colors.up : colors.down;
  const bg = positive ? colors.upSoft : colors.downSoft;
  const small = size === 'sm';

  return (
    <View style={[styles.badge, small && styles.small, { backgroundColor: bg }]}>
      <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={small ? 10 : 12} color={fg} />
      <Text style={[styles.text, small && styles.textSmall, { color: fg }]}>
        {formatPercent(Math.abs(value), { sign: false })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  small: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 12.5, fontFamily: fonts.monoBold },
  textSmall: { fontSize: 11 },
});

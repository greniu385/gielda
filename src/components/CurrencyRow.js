import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';
import { getCurrency } from '../simulation/currencies';
import { getChangePercent } from '../simulation/marketEngine';
import { formatRate } from '../utils/format';
import ChangeBadge from './ChangeBadge';
import CurrencyAvatar from './CurrencyAvatar';
import Sparkline from './Sparkline';

function CurrencyRow({ quote, onPress }) {
  const { colors } = useAppTheme();
  const currency = getCurrency(quote.code);
  const change = getChangePercent(quote);
  const trendColor = change >= 0 ? colors.up : colors.down;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${currency.name}, kurs ${formatRate(quote.mid)} złotych`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border },
      ]}
    >
      <CurrencyAvatar code={quote.code} />
      <View style={styles.info}>
        <Text style={[styles.code, { color: colors.text }]}>{quote.code}</Text>
        <Text style={[styles.name, { color: colors.textMuted }]} numberOfLines={1}>
          {currency.name}
        </Text>
      </View>
      <Sparkline data={quote.history.slice(-40)} color={trendColor} />
      <View style={styles.price}>
        <Text style={[styles.rate, { color: colors.text }]}>{formatRate(quote.mid)}</Text>
        <ChangeBadge value={change} size="sm" />
      </View>
    </Pressable>
  );
}

export default memo(CurrencyRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  info: { flex: 1, minWidth: 0 },
  code: { fontSize: 16, fontWeight: '800' },
  name: { fontSize: 12.5, marginTop: 2 },
  price: { alignItems: 'flex-end', gap: 4, minWidth: 82 },
  rate: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

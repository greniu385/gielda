import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMarket } from '../context/MarketContext';
import { useAppTheme } from '../theme/ThemeContext';
import { getChangePercent } from '../simulation/marketEngine';
import { formatPercent, formatRate } from '../utils/format';

// Pasek z bieżącymi kursami walut (aktualizowany na żywo przez symulację).
export default function LiveTicker({ codes }) {
  const { colors } = useAppTheme();
  const { quotes } = useMarket();
  const list = (codes ?? Object.keys(quotes)).map((code) => quotes[code]).filter(Boolean);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {list.map((quote) => {
        const change = getChangePercent(quote);
        return (
          <View key={quote.code} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.code, { color: colors.textMuted }]}>{quote.code}/PLN</Text>
            <Text style={[styles.rate, { color: colors.text }]}>{formatRate(quote.mid)}</Text>
            <Text style={[styles.change, { color: change >= 0 ? colors.up : colors.down }]}>{formatPercent(change)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: 8, paddingVertical: 2, alignItems: 'flex-start' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 96,
  },
  code: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  rate: { fontSize: 15, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  change: { fontSize: 11.5, fontWeight: '700', marginTop: 1 },
});

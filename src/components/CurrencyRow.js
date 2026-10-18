import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { getCurrency } from '../simulation/currencies';
import { getAskPrice, getBidPrice, getChangePercent } from '../simulation/marketEngine';
import { formatRate } from '../utils/format';
import ChangeBadge from './ChangeBadge';
import CurrencyAvatar from './CurrencyAvatar';
import Sparkline from './Sparkline';
import { fonts } from '../theme/fonts';

// Ile kolumn tabeli walut zmieści się w danej szerokości (w pikselach):
// 'full' — z wykresem, 'medium' — bez wykresu, null — zwykła lista jak na telefonie.
export function getTableColumns(width) {
  if (width >= 860) return 'full';
  if (width >= 680) return 'medium';
  return null;
}

// Wiersz listy walut. `columns` — wersja tabelaryczna na komputer
// (dodatkowe kolumny z kursem kupna i sprzedaży).
function CurrencyRow({ quote, onPress, columns = null }) {
  const wide = Boolean(columns);
  const { colors } = useAppTheme();
  const currency = getCurrency(quote.code);
  const change = getChangePercent(quote);
  const trendColor = change >= 0 ? colors.up : colors.down;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${currency.name}, kurs ${formatRate(quote.mid)} złotych`}
      style={({ pressed, hovered }) => [
        styles.row,
        wide && styles.rowWide,
        {
          backgroundColor: pressed || hovered ? colors.surfaceAlt : colors.surface,
          borderColor: hovered ? colors.primary : colors.border,
        },
      ]}
    >
      <CurrencyAvatar code={quote.code} size={wide ? 40 : 44} />
      <View style={[styles.info, wide && styles.infoWide]}>
        <Text style={[styles.code, { color: colors.text }]}>{quote.code}</Text>
        <Text style={[styles.name, { color: colors.textMuted }]} numberOfLines={1}>
          {currency.name}
        </Text>
      </View>
      {wide ? (
        <>
          {columns === 'full' ? (
            <Sparkline data={quote.history.slice(-60)} color={trendColor} width={150} height={36} />
          ) : null}
          <Text style={[styles.cell, styles.cellStrong, { color: colors.text }]}>{formatRate(quote.mid)}</Text>
          <Text style={[styles.cell, { color: colors.up }]}>{formatRate(getAskPrice(quote))}</Text>
          <Text style={[styles.cell, { color: colors.down }]}>{formatRate(getBidPrice(quote))}</Text>
          <View style={styles.changeCell}>
            <ChangeBadge value={change} size="sm" />
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </>
      ) : (
        <>
          <Sparkline data={quote.history.slice(-40)} color={trendColor} />
          <View style={styles.price}>
            <Text style={[styles.rate, { color: colors.text }]}>{formatRate(quote.mid)}</Text>
            <ChangeBadge value={change} size="sm" />
          </View>
        </>
      )}
    </Pressable>
  );
}

export default memo(CurrencyRow);

// Nagłówek tabeli walut (tylko wersja na komputer) — szerokości kolumn jak w wierszu.
export function CurrencyTableHeader({ columns }) {
  const { colors } = useAppTheme();
  const label = [styles.headerLabel, { color: colors.textSubtle }];
  return (
    <View style={styles.header}>
      <View style={{ width: 40 }} />
      <Text style={[label, styles.info, styles.infoWide]}>WALUTA</Text>
      {columns === 'full' ? <Text style={[label, { width: 150 }]}>OSTATNIE NOTOWANIA</Text> : null}
      <Text style={[styles.cell, label]}>KURS ŚREDNI</Text>
      <Text style={[styles.cell, label]}>KUPISZ PO</Text>
      <Text style={[styles.cell, label]}>SPRZEDASZ PO</Text>
      <Text style={[styles.changeCell, label]}>ZMIANA</Text>
      <View style={{ width: 18 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  rowWide: { gap: 16, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, marginBottom: 8 },
  info: { flex: 1, minWidth: 0 },
  infoWide: { minWidth: 120 },
  code: { fontSize: 16, fontFamily: fonts.bold },
  name: { fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 },
  price: { alignItems: 'flex-end', gap: 4, minWidth: 82 },
  rate: { fontSize: 16, fontFamily: fonts.monoBold },
  cell: { width: 104, textAlign: 'right', fontSize: 15, fontFamily: fonts.monoMedium },
  cellStrong: { fontFamily: fonts.monoBold },
  changeCell: { width: 86, alignItems: 'flex-end', textAlign: 'right' },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 19, marginBottom: 8 },
  headerLabel: { fontSize: 10.5, fontFamily: fonts.bold, letterSpacing: 0.4 },
});

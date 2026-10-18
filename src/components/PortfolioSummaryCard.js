import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { BASE_CURRENCY, STARTING_BALANCE, getBalance } from '../logic/trading';
import { formatMoney, formatPercent, formatSignedMoney } from '../utils/format';
import { fonts } from '../theme/fonts';

// Karta z łączną wartością portfela i wynikiem względem kwoty startowej.
export default function PortfolioSummaryCard({ portfolio, totalValue, onPress }) {
  const { colors } = useAppTheme();
  const start = portfolio?.startingBalance ?? STARTING_BALANCE;
  const profit = totalValue - start;
  const profitPercent = (profit / start) * 100;
  const cash = getBalance(portfolio, BASE_CURRENCY);
  const invested = Math.max(0, totalValue - cash);
  const ink = { color: colors.heroText };
  const muted = { color: colors.heroMuted };

  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button">
      {({ hovered }) => (
        <View style={[styles.card, { backgroundColor: colors.heroBg, opacity: hovered ? 0.94 : 1 }]}>
          <View style={styles.topRow}>
            <Text style={[styles.label, muted]}>WARTOŚĆ PORTFELA</Text>
            {onPress ? <Ionicons name="arrow-forward" size={18} color={colors.heroMuted} /> : null}
          </View>
          <Text style={[styles.value, ink]} numberOfLines={1}>
            {formatMoney(totalValue)}
          </Text>
          <View style={styles.profitRow}>
            <View style={[styles.profitPill, { borderColor: colors.heroLine }]}>
              <Ionicons name={profit >= 0 ? 'trending-up' : 'trending-down'} size={14} color={colors.heroText} />
              <Text style={[styles.profitText, ink]}>{formatPercent(profitPercent)}</Text>
            </View>
            <Text style={[styles.profitAmount, muted]}>{formatSignedMoney(profit)} od startu</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.heroLine }]} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, muted]}>Gotówka (PLN)</Text>
              <Text style={[styles.statValue, ink]}>{formatMoney(cash)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statLabel, muted]}>Zainwestowane</Text>
              <Text style={[styles.statValue, ink]}>{formatMoney(invested)}</Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, padding: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.2 },
  value: { fontSize: 34, fontFamily: fonts.monoBold, letterSpacing: -1, marginTop: 8 },
  profitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  profitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  profitText: { fontSize: 13, fontFamily: fonts.monoBold },
  profitAmount: { fontSize: 13, fontFamily: fonts.monoMedium },
  divider: { height: 1, marginVertical: 16 },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1 },
  statLabel: { fontSize: 12.5, fontFamily: fonts.medium },
  statValue: { fontSize: 16, fontFamily: fonts.monoBold, marginTop: 3 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { BASE_CURRENCY, STARTING_BALANCE, getBalance } from '../logic/trading';
import { formatMoney, formatPercent, formatSignedMoney } from '../utils/format';

// Karta z łączną wartością portfela i wynikiem względem kwoty startowej.
export default function PortfolioSummaryCard({ portfolio, totalValue, onPress }) {
  const { colors } = useAppTheme();
  const start = portfolio?.startingBalance ?? STARTING_BALANCE;
  const profit = totalValue - start;
  const profitPercent = (profit / start) * 100;
  const cash = getBalance(portfolio, BASE_CURRENCY);
  const invested = Math.max(0, totalValue - cash);

  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button">
      <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.decorCircle} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />

        <View style={styles.topRow}>
          <Text style={styles.label}>Wartość portfela</Text>
          {onPress ? <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" /> : null}
        </View>
        <Text style={styles.value} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(totalValue)}
        </Text>
        <View style={styles.profitRow}>
          <View style={styles.profitPill}>
            <Ionicons name={profit >= 0 ? 'trending-up' : 'trending-down'} size={14} color="#FFFFFF" />
            <Text style={styles.profitText}>{formatPercent(profitPercent)}</Text>
          </View>
          <Text style={styles.profitAmount}>{formatSignedMoney(profit)} od startu</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Dostępne PLN</Text>
            <Text style={styles.statValue}>{formatMoney(cash)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>W walutach</Text>
            <Text style={styles.statValue}>{formatMoney(invested)}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 26, padding: 20, overflow: 'hidden' },
  decorCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -90,
    right: -60,
  },
  decorCircle2: { width: 140, height: 140, borderRadius: 70, top: undefined, bottom: -70, right: 60 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  value: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 6 },
  profitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  profitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  profitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  profitAmount: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 16 },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12.5, fontWeight: '600' },
  statValue: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '800', marginTop: 3 },
});

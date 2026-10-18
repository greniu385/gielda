import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import AppButton from '../../../components/AppButton';
import Card from '../../../components/Card';
import ChangeBadge from '../../../components/ChangeBadge';
import CurrencyAvatar from '../../../components/CurrencyAvatar';
import EmptyState from '../../../components/EmptyState';
import PortfolioSummaryCard from '../../../components/PortfolioSummaryCard';
import Screen from '../../../components/Screen';
import ScreenHeader from '../../../components/ScreenHeader';
import { useMarket } from '../../../context/MarketContext';
import { usePortfolio } from '../../../context/PortfolioContext';
import { BASE_CURRENCY, getBalance, getHoldings, getPortfolioValue } from '../../../logic/trading';
import { getCurrency } from '../../../simulation/currencies';
import { useAppTheme } from '../../../theme/ThemeContext';
import { formatMoney, formatNumber, formatRate, formatSignedMoney } from '../../../utils/format';

const ALLOCATION_COLORS = ['#6C8CFF', '#2BD67B', '#FFB547', '#FF5C7A', '#22D3EE', '#C084FC', '#F472B6', '#A3E635', '#FB923C'];

export default function WalletScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { quotes } = useMarket();
  const { portfolio, loading } = usePortfolio();

  if (loading && !portfolio) {
    return (
      <Screen>
        <ScreenHeader title="Portfel" />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const totalValue = getPortfolioValue(portfolio, quotes);
  const cash = getBalance(portfolio, BASE_CURRENCY);
  const holdings = getHoldings(portfolio, quotes);
  const unrealized = holdings.reduce((sum, h) => sum + h.pnl, 0);
  const realized = portfolio?.realizedPnl ?? 0;

  const allocation = [{ code: BASE_CURRENCY, value: cash }, ...holdings].map((item, i) => ({
    ...item,
    color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
    share: totalValue > 0 ? item.value / totalValue : 0,
  }));

  return (
    <Screen scroll>
      <ScreenHeader title="Portfel" subtitle="Twoje środki i inwestycje" />

      <PortfolioSummaryCard portfolio={portfolio} totalValue={totalValue} />

      <View style={styles.statsRow}>
        <StatTile label="Zysk zrealizowany" value={formatSignedMoney(realized)} color={realized >= 0 ? colors.up : colors.down} />
        <StatTile label="Zysk bieżący" value={formatSignedMoney(unrealized)} color={unrealized >= 0 ? colors.up : colors.down} />
        <StatTile label="Transakcje" value={String(portfolio?.tradesCount ?? 0)} />
      </View>

      <Card style={styles.section}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Struktura portfela</Text>
        <View style={[styles.bar, { backgroundColor: colors.surfaceAlt }]}>
          {allocation
            .filter((a) => a.share > 0.001)
            .map((a) => (
              <View key={a.code} style={{ flex: a.share, backgroundColor: a.color }} />
            ))}
        </View>
        <View style={styles.legend}>
          {allocation.map((a) => (
            <View key={a.code} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: a.color }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>
                {a.code} {formatNumber(a.share * 100, 1)}%
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Aktywa</Text>

      <View style={[styles.assetRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CurrencyAvatar code={BASE_CURRENCY} />
        <View style={styles.assetInfo}>
          <Text style={[styles.assetCode, { color: colors.text }]}>PLN</Text>
          <Text style={[styles.assetSub, { color: colors.textMuted }]}>Złoty polski · gotówka</Text>
        </View>
        <Text style={[styles.assetValue, { color: colors.text }]}>{formatMoney(cash)}</Text>
      </View>

      {holdings.map((h) => (
        <Pressable
          key={h.code}
          onPress={() => router.push(`/currency/${h.code}`)}
          style={({ pressed }) => [
            styles.assetRow,
            { backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderColor: colors.border },
          ]}
        >
          <CurrencyAvatar code={h.code} />
          <View style={styles.assetInfo}>
            <Text style={[styles.assetCode, { color: colors.text }]}>
              {formatNumber(h.amount)} {h.code}
            </Text>
            <Text style={[styles.assetSub, { color: colors.textMuted }]} numberOfLines={1}>
              {getCurrency(h.code)?.name} · śr. {formatRate(h.avgPrice)}
            </Text>
          </View>
          <View style={styles.assetRight}>
            <Text style={[styles.assetValue, { color: colors.text }]}>{formatMoney(h.value)}</Text>
            <ChangeBadge value={h.pnlPercent} size="sm" />
          </View>
        </Pressable>
      ))}

      {holdings.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="Nie masz jeszcze walut"
          message="Kup pierwszą walutę na rynku i obserwuj, jak zmienia się jej wartość."
        >
          <AppButton title="Przejdź do rynku" icon="stats-chart" onPress={() => router.navigate('/')} small />
        </EmptyState>
      ) : null}
    </Screen>
  );
}

function StatTile({ label, value, color }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.tileLabel, { color: colors.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.tileValue, { color: color ?? colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tile: { flex: 1, borderRadius: 16, padding: 12, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between', minHeight: 78 },
  tileLabel: { fontSize: 12, fontWeight: '600' },
  tileValue: { fontSize: 15, fontWeight: '800', marginTop: 6 },
  section: { marginTop: 16 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12.5, fontWeight: '600' },
  sectionTitle: { fontSize: 19, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  assetInfo: { flex: 1, minWidth: 0 },
  assetCode: { fontSize: 15.5, fontWeight: '800' },
  assetSub: { fontSize: 12.5, marginTop: 2 },
  assetRight: { alignItems: 'flex-end', gap: 4 },
  assetValue: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

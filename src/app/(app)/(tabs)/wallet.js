import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
import { useResponsive } from '../../../hooks/useResponsive';
import { BASE_CURRENCY, getBalance, getHoldings, getPortfolioValue } from '../../../logic/trading';
import { getCurrency } from '../../../simulation/currencies';
import { getBidPrice } from '../../../simulation/marketEngine';
import { useAppTheme } from '../../../theme/ThemeContext';
import { formatMoney, formatNumber, formatRate, formatSignedMoney } from '../../../utils/format';

const ALLOCATION_COLORS = [
  '#6C8CFF',
  '#2BD67B',
  '#FFB547',
  '#FF5C7A',
  '#22D3EE',
  '#C084FC',
  '#F472B6',
  '#A3E635',
  '#FB923C',
];

export default function WalletScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { isWide, isDesktop } = useResponsive();
  const { quotes } = useMarket();
  const { portfolio, loading } = usePortfolio();
  const [listWidth, setListWidth] = useState(0);
  // Tabela z kolumnami tylko wtedy, gdy faktycznie się mieści (szerokie okno).
  const table = isWide && listWidth >= 860;

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

  const stats = (
    <View style={[styles.statsRow, isDesktop && styles.statsRowWide]}>
      <StatTile
        label="Zysk zrealizowany"
        value={formatSignedMoney(realized)}
        color={realized >= 0 ? colors.up : colors.down}
      />
      <StatTile
        label="Zysk bieżący"
        value={formatSignedMoney(unrealized)}
        color={unrealized >= 0 ? colors.up : colors.down}
      />
      <StatTile label="Transakcje" value={String(portfolio?.tradesCount ?? 0)} />
    </View>
  );

  const allocationCard = (
    <Card style={[styles.section, isDesktop && styles.allocationWide]}>
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
  );

  return (
    <Screen scroll>
      <ScreenHeader title="Portfel" subtitle="Twoje środki i inwestycje" />

      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.half}>
            <PortfolioSummaryCard portfolio={portfolio} totalValue={totalValue} />
          </View>
          <View style={styles.half}>
            {stats}
            {allocationCard}
          </View>
        </View>
      ) : (
        <>
          <PortfolioSummaryCard portfolio={portfolio} totalValue={totalValue} />
          {stats}
          {allocationCard}
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Aktywa</Text>

      <View onLayout={(e) => setListWidth(e.nativeEvent.layout.width)}>
        {table ? <AssetsTableHeader /> : null}

        <AssetRow
          code={BASE_CURRENCY}
          title="PLN"
          subtitle="Złoty polski · gotówka"
          value={cash}
          wide={table}
          amount={cash}
        />

        {holdings.map((h) => (
          <AssetRow
            key={h.code}
            code={h.code}
            title={table ? h.code : `${formatNumber(h.amount)} ${h.code}`}
            subtitle={
              table ? getCurrency(h.code)?.name : `${getCurrency(h.code)?.name} · śr. ${formatRate(h.avgPrice)}`
            }
            holding={h}
            bid={getBidPrice(quotes[h.code])}
            value={h.value}
            amount={h.amount}
            wide={table}
            onPress={() => router.push(`/currency/${h.code}`)}
          />
        ))}
      </View>

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

function AssetsTableHeader() {
  const { colors } = useAppTheme();
  const label = [styles.headerLabel, { color: colors.textSubtle }];
  return (
    <View style={styles.tableHeader}>
      <View style={{ width: 40 }} />
      <Text style={[label, styles.assetInfo]}>WALUTA</Text>
      <Text style={[styles.cell, label]}>ILOŚĆ</Text>
      <Text style={[styles.cell, label]}>ŚR. ZAKUP</Text>
      <Text style={[styles.cell, label]}>KURS DZIŚ</Text>
      <Text style={[styles.cell, label]}>WARTOŚĆ</Text>
      <Text style={[styles.cellWide, label]}>WYNIK</Text>
      <View style={{ width: 18 }} />
    </View>
  );
}

function AssetRow({ code, title, subtitle, value, amount, holding, bid, wide, onPress }) {
  const { colors } = useAppTheme();
  const textCell = [styles.cell, { color: colors.text }];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed, hovered }) => [
        styles.assetRow,
        wide && styles.assetRowWide,
        {
          backgroundColor: onPress && (pressed || hovered) ? colors.surfaceAlt : colors.surface,
          borderColor: onPress && hovered ? colors.primary : colors.border,
        },
      ]}
    >
      <CurrencyAvatar code={code} size={wide ? 40 : 44} />
      <View style={styles.assetInfo}>
        <Text style={[styles.assetCode, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.assetSub, { color: colors.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {wide ? (
        <>
          <Text style={textCell}>{formatNumber(amount)}</Text>
          <Text style={textCell}>{holding ? formatRate(holding.avgPrice) : '—'}</Text>
          <Text style={textCell}>{bid ? formatRate(bid) : '—'}</Text>
          <Text style={[textCell, styles.cellStrong]}>{formatMoney(value)}</Text>
          <View style={styles.cellWide}>
            {holding ? (
              <>
                <Text style={[styles.pnl, { color: holding.pnl >= 0 ? colors.up : colors.down }]}>
                  {formatSignedMoney(holding.pnl)}
                </Text>
                <View>
                  <ChangeBadge value={holding.pnlPercent} size="sm" />
                </View>
              </>
            ) : (
              <Text style={[styles.pnl, { color: colors.textSubtle }]}>—</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={onPress ? colors.textSubtle : 'transparent'} />
        </>
      ) : (
        <View style={styles.assetRight}>
          <Text style={[styles.assetValue, { color: colors.text }]}>{formatMoney(value)}</Text>
          {holding ? <ChangeBadge value={holding.pnlPercent} size="sm" /> : null}
        </View>
      )}
    </Pressable>
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
  columns: { flexDirection: 'row', gap: 24, alignItems: 'stretch' },
  half: { flex: 1, minWidth: 0 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statsRowWide: { marginTop: 0 },
  tile: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
    minHeight: 78,
  },
  tileLabel: { fontSize: 12, fontWeight: '600' },
  tileValue: { fontSize: 15, fontWeight: '800', marginTop: 6 },
  section: { marginTop: 16 },
  allocationWide: { flex: 1, marginTop: 12 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 14 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12.5, fontWeight: '600' },
  sectionTitle: { fontSize: 19, fontWeight: '800', marginTop: 28, marginBottom: 12 },
  tableHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 19, marginBottom: 8 },
  headerLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  assetRowWide: { gap: 16, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 16, marginBottom: 8 },
  assetInfo: { flex: 1, minWidth: 0 },
  assetCode: { fontSize: 15.5, fontWeight: '800' },
  assetSub: { fontSize: 12.5, marginTop: 2 },
  assetRight: { alignItems: 'flex-end', gap: 4 },
  assetValue: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cell: { width: 108, textAlign: 'right', fontSize: 14.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  cellStrong: { fontWeight: '800' },
  cellWide: { width: 120, alignItems: 'flex-end', textAlign: 'right', gap: 4 },
  pnl: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

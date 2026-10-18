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
import { BASE_CURRENCY, getBalance, getHoldings, getPortfolioValue, getShortPositions } from '../../../logic/trading';
import { getCurrency } from '../../../simulation/currencies';
import { getBidPrice } from '../../../simulation/marketEngine';
import { useAppTheme } from '../../../theme/ThemeContext';
import { formatMoney, formatNumber, formatRate, formatSignedMoney } from '../../../utils/format';
import { fonts } from '../../../theme/fonts';

// Stonowane kolory segmentów (PLN zawsze szary).
const ALLOCATION_COLORS = [
  '#8F8B80',
  '#E0A33B',
  '#3E9C7E',
  '#4F7FAF',
  '#C0603F',
  '#8C7AA8',
  '#B5A642',
  '#5E9EA0',
  '#B07A5A',
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
  const shorts = getShortPositions(portfolio, quotes);
  const unrealized = [...holdings, ...shorts].reduce((sum, p) => sum + p.pnl, 0);
  const realized = portfolio?.realizedPnl ?? 0;

  const allocation = [
    { key: BASE_CURRENCY, label: BASE_CURRENCY, value: cash },
    ...holdings.map((h) => ({ key: h.code, label: h.code, value: h.value })),
    ...shorts.map((p) => ({ key: `${p.code}-short`, label: `${p.code} short`, value: p.value })),
  ].map((item, i) => ({
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
            <View key={a.key} style={{ flex: a.share, backgroundColor: a.color }} />
          ))}
      </View>
      <View style={styles.legend}>
        {allocation.map((a) => (
          <View key={a.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: a.color }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>
              {a.label} {formatNumber(a.share * 100, 1)}%
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
        {table ? <AssetsTableHeader labels={['ILOŚĆ', 'ŚR. ZAKUP', 'KURS DZIŚ', 'WARTOŚĆ']} /> : null}

        <AssetRow
          code={BASE_CURRENCY}
          title="PLN"
          subtitle="Złoty polski · gotówka"
          cells={[formatNumber(cash), '—', '—', formatMoney(cash)]}
          value={cash}
          wide={table}
        />

        {holdings.map((h) => (
          <AssetRow
            key={h.code}
            code={h.code}
            title={table ? h.code : `${formatNumber(h.amount)} ${h.code}`}
            subtitle={
              table ? getCurrency(h.code)?.name : `${getCurrency(h.code)?.name} · śr. ${formatRate(h.avgPrice)}`
            }
            cells={[
              formatNumber(h.amount),
              formatRate(h.avgPrice),
              formatRate(getBidPrice(quotes[h.code])),
              formatMoney(h.value),
            ]}
            value={h.value}
            result={h}
            wide={table}
            onPress={() => router.push(`/currency/${h.code}`)}
          />
        ))}
      </View>

      {shorts.length ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pozycje krótkie (gra na spadek)</Text>
          {table ? <AssetsTableHeader labels={['ILOŚĆ', 'OTWARCIE', 'ODKUP DZIŚ', 'DEPOZYT']} /> : null}
          {shorts.map((p) => (
            <AssetRow
              key={p.code}
              code={p.code}
              title={table ? `${p.code} short` : `${formatNumber(p.amount)} ${p.code} short`}
              subtitle={
                table
                  ? getCurrency(p.code)?.name
                  : `otwarcie ${formatRate(p.entryPrice)} · depozyt ${formatMoney(p.margin)}`
              }
              cells={[
                formatNumber(p.amount),
                formatRate(p.entryPrice),
                formatRate(p.closePrice),
                formatMoney(p.margin),
              ]}
              value={p.value}
              result={p}
              wide={table}
              accent={colors.short}
              onPress={() => router.push(`/currency/${p.code}`)}
            />
          ))}
        </>
      ) : null}

      {holdings.length === 0 && shorts.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="Nie masz jeszcze walut"
          message="Kup walutę albo zagraj na spadek jej kursu i obserwuj, jak zmienia się wartość portfela."
        >
          <AppButton title="Przejdź do rynku" icon="stats-chart" onPress={() => router.navigate('/')} small />
        </EmptyState>
      ) : null}
    </Screen>
  );
}

function AssetsTableHeader({ labels }) {
  const { colors } = useAppTheme();
  const label = [styles.headerLabel, { color: colors.textSubtle }];
  return (
    <View style={styles.tableHeader}>
      <View style={{ width: 40 }} />
      <Text style={[label, styles.assetInfo]}>WALUTA</Text>
      {labels.map((text) => (
        <Text key={text} style={[styles.cell, label]}>
          {text}
        </Text>
      ))}
      <Text style={[styles.cellWide, label]}>WYNIK</Text>
      <View style={{ width: 18 }} />
    </View>
  );
}

// Wiersz tabeli aktywów. `cells` — wartości kolumn na komputerze, `result` — { pnl, pnlPercent }.
function AssetRow({ code, title, subtitle, cells, value, result, wide, accent, onPress }) {
  const { colors } = useAppTheme();
  const textCell = [styles.cell, { color: colors.text }];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed, hovered }) => [
        styles.assetRow,
        wide && styles.assetRowWide,
        accent && { borderLeftWidth: 3, borderLeftColor: accent },
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
          {cells.map((cell, i) => (
            <Text key={i} style={[textCell, i === cells.length - 1 && styles.cellStrong]}>
              {cell}
            </Text>
          ))}
          <View style={styles.cellWide}>
            {result ? (
              <>
                <Text style={[styles.pnl, { color: result.pnl >= 0 ? colors.up : colors.down }]}>
                  {formatSignedMoney(result.pnl)}
                </Text>
                <View>
                  <ChangeBadge value={result.pnlPercent} size="sm" />
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
          {result ? <ChangeBadge value={result.pnlPercent} size="sm" /> : null}
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
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
    minHeight: 78,
  },
  tileLabel: { fontSize: 12, fontFamily: fonts.semibold },
  tileValue: { fontSize: 15, fontFamily: fonts.monoBold, marginTop: 6 },
  section: { marginTop: 16 },
  allocationWide: { flex: 1, marginTop: 12 },
  cardTitle: { fontSize: 17, fontFamily: fonts.bold, marginBottom: 14 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12.5, fontFamily: fonts.semibold },
  sectionTitle: { fontSize: 19, fontFamily: fonts.bold, marginTop: 28, marginBottom: 12 },
  tableHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 19, marginBottom: 8 },
  headerLabel: { fontSize: 10.5, fontFamily: fonts.bold, letterSpacing: 0.4 },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  assetRowWide: { gap: 16, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, marginBottom: 8 },
  assetInfo: { flex: 1, minWidth: 0 },
  assetCode: { fontSize: 15.5, fontFamily: fonts.bold },
  assetSub: { fontSize: 12.5, fontFamily: fonts.regular, marginTop: 2 },
  assetRight: { alignItems: 'flex-end', gap: 4 },
  assetValue: { fontSize: 15, fontFamily: fonts.monoBold },
  cell: { width: 108, textAlign: 'right', fontSize: 14.5, fontFamily: fonts.monoMedium },
  cellStrong: { fontFamily: fonts.monoBold },
  cellWide: { width: 120, alignItems: 'flex-end', textAlign: 'right', gap: 4 },
  pnl: { fontSize: 14, fontFamily: fonts.monoBold },
});

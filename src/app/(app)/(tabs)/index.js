import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import CurrencyRow, { CurrencyTableHeader, getTableColumns } from '../../../components/CurrencyRow';
import LiveDot from '../../../components/LiveDot';
import NewsItem from '../../../components/NewsItem';
import PortfolioSummaryCard from '../../../components/PortfolioSummaryCard';
import Screen from '../../../components/Screen';
import ScreenHeader from '../../../components/ScreenHeader';
import SegmentedControl from '../../../components/SegmentedControl';
import { useAuth } from '../../../context/AuthContext';
import { useMarket } from '../../../context/MarketContext';
import { usePortfolio } from '../../../context/PortfolioContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { getPortfolioValue } from '../../../logic/trading';
import { SPEEDS, getChangePercent } from '../../../simulation/marketEngine';
import { useAppTheme } from '../../../theme/ThemeContext';
import { fonts } from '../../../theme/fonts';

const SORT_OPTIONS = [
  { value: 'default', label: 'Wszystkie' },
  { value: 'gainers', label: 'Wzrosty' },
  { value: 'losers', label: 'Spadki' },
];

export default function MarketScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { isWide, isDesktop } = useResponsive();
  const { market, quotes, news, settings, updateSettings } = useMarket();
  const { portfolio } = usePortfolio();
  const { user } = useAuth();
  const [sort, setSort] = useState('default');
  const [showAllNews, setShowAllNews] = useState(false);
  const [listWidth, setListWidth] = useState(0);
  const columns = isWide ? getTableColumns(listWidth) : null;

  const totalValue = getPortfolioValue(portfolio, quotes);
  const firstName = user?.displayName?.split(' ')[0];

  const list = useMemo(() => {
    const all = Object.values(quotes);
    if (sort === 'gainers')
      return all.filter((q) => getChangePercent(q) >= 0).sort((a, b) => getChangePercent(b) - getChangePercent(a));
    if (sort === 'losers')
      return all.filter((q) => getChangePercent(q) < 0).sort((a, b) => getChangePercent(a) - getChangePercent(b));
    return all;
  }, [quotes, sort]);

  // Na komputerze obok podsumowania portfela mieszczą się dwie ostatnie wiadomości.
  const visibleNews = showAllNews ? news.slice(0, 6) : news.slice(0, isDesktop ? 2 : 1);

  const summary = (
    <PortfolioSummaryCard portfolio={portfolio} totalValue={totalValue} onPress={() => router.navigate('/wallet')} />
  );

  const status = (
    <View
      style={[
        styles.status,
        isDesktop && styles.statusWide,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <LiveDot color={settings.paused ? colors.warning : colors.up} active={!settings.paused} />
      <View style={styles.statusText}>
        <Text style={[styles.statusTitle, { color: colors.text }]}>
          {settings.paused ? 'Symulacja wstrzymana' : 'Symulacja na żywo'}
        </Text>
        <Text style={[styles.statusSub, { color: colors.textMuted }]}>
          Tick #{market.tick} · {SPEEDS[settings.speed].label} ·{' '}
          {market.source === 'nbp' ? `start: kursy NBP z ${market.sourceDate}` : 'start: kursy wbudowane'}
        </Text>
      </View>
      <Pressable
        onPress={() => updateSettings({ paused: !settings.paused })}
        accessibilityRole="button"
        accessibilityLabel={settings.paused ? 'Wznów symulację' : 'Wstrzymaj symulację'}
        style={({ hovered }) => [
          styles.pauseButton,
          { backgroundColor: hovered ? colors.primary : colors.primarySoft },
        ]}
      >
        {({ hovered }) => (
          <Ionicons name={settings.paused ? 'play' : 'pause'} size={18} color={hovered ? '#FFFFFF' : colors.primary} />
        )}
      </Pressable>
    </View>
  );

  const newsSection = (
    <>
      <View style={[styles.sectionHeader, isDesktop && styles.newsHeaderWide]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Wiadomości rynkowe</Text>
        {news.length > visibleNews.length || showAllNews ? (
          <Pressable onPress={() => setShowAllNews((v) => !v)} hitSlop={8}>
            <Text style={[styles.sectionAction, { color: colors.primary }]}>
              {showAllNews ? 'Zwiń' : `Więcej (${news.length})`}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {visibleNews.length ? (
        visibleNews.map((item) => <NewsItem key={item.id} news={item} compact={!showAllNews} />)
      ) : (
        <View style={[styles.noNews, { borderColor: colors.border }]}>
          <Ionicons name="newspaper-outline" size={18} color={colors.textSubtle} />
          <Text style={[styles.noNewsText, { color: colors.textMuted }]}>
            Na razie spokojnie… Wiadomości pojawią się, gdy coś poruszy rynkiem.
          </Text>
        </View>
      )}
    </>
  );

  const ratesSection = (
    <>
      <View style={[styles.sectionHeader, isDesktop && styles.ratesHeaderWide]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Kursy walut</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          PLN za 1 jednostkę · kliknij walutę, aby handlować
        </Text>
      </View>
      <SegmentedControl
        options={SORT_OPTIONS}
        value={sort}
        onChange={setSort}
        style={[styles.sort, isWide && styles.sortWide]}
      />
      <View onLayout={(e) => setListWidth(e.nativeEvent.layout.width)}>
        {columns && list.length ? <CurrencyTableHeader columns={columns} /> : null}
        {list.map((quote) => (
          <CurrencyRow
            key={quote.code}
            quote={quote}
            columns={columns}
            onPress={() => router.push(`/currency/${quote.code}`)}
          />
        ))}
      </View>
      {list.length === 0 ? (
        <Text style={[styles.emptyList, { color: colors.textMuted }]}>Brak walut w tej kategorii.</Text>
      ) : null}
    </>
  );

  return (
    <Screen scroll>
      <ScreenHeader title="Rynek" subtitle={firstName ? `Cześć, ${firstName}` : 'Witaj'} />
      {isDesktop ? (
        <>
          <View style={styles.topRow}>
            <View style={styles.topColumn}>{summary}</View>
            <View style={styles.topColumn}>
              {status}
              {newsSection}
            </View>
          </View>
          {ratesSection}
        </>
      ) : (
        <>
          {summary}
          {status}
          {newsSection}
          {ratesSection}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  topColumn: { flex: 1, minWidth: 0 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingLeft: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
  },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 14.5, fontFamily: fonts.bold },
  statusSub: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  pauseButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  statusWide: { marginTop: 0 },
  newsHeaderWide: { marginTop: 18, marginBottom: 10 },
  ratesHeaderWide: { marginTop: 32 },
  sectionTitle: { fontSize: 19, fontFamily: fonts.bold, letterSpacing: -0.3 },
  sectionAction: { fontSize: 14, fontFamily: fonts.bold },
  sectionHint: { fontSize: 12.5, fontFamily: fonts.regular },
  noNews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noNewsText: { flex: 1, fontSize: 13.5, fontFamily: fonts.regular, lineHeight: 19 },
  sort: { marginBottom: 12 },
  sortWide: { alignSelf: 'flex-start', width: 380, marginBottom: 18 },
  emptyList: { textAlign: 'center', paddingVertical: 20 },
});

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import CurrencyRow from '../../../components/CurrencyRow';
import LiveDot from '../../../components/LiveDot';
import NewsItem from '../../../components/NewsItem';
import PortfolioSummaryCard from '../../../components/PortfolioSummaryCard';
import Screen from '../../../components/Screen';
import ScreenHeader from '../../../components/ScreenHeader';
import SegmentedControl from '../../../components/SegmentedControl';
import { useMarket } from '../../../context/MarketContext';
import { usePortfolio } from '../../../context/PortfolioContext';
import { getPortfolioValue } from '../../../logic/trading';
import { SPEEDS, getChangePercent } from '../../../simulation/marketEngine';
import { useAppTheme } from '../../../theme/ThemeContext';

const SORT_OPTIONS = [
  { value: 'default', label: 'Wszystkie' },
  { value: 'gainers', label: 'Wzrosty' },
  { value: 'losers', label: 'Spadki' },
];

export default function MarketScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { market, quotes, news, settings, updateSettings } = useMarket();
  const { portfolio } = usePortfolio();
  const [sort, setSort] = useState('default');
  const [showAllNews, setShowAllNews] = useState(false);

  const totalValue = getPortfolioValue(portfolio, quotes);
  const firstName = portfolio?.displayName?.split(' ')[0];

  const list = useMemo(() => {
    const all = Object.values(quotes);
    if (sort === 'gainers') return all.filter((q) => getChangePercent(q) >= 0).sort((a, b) => getChangePercent(b) - getChangePercent(a));
    if (sort === 'losers') return all.filter((q) => getChangePercent(q) < 0).sort((a, b) => getChangePercent(a) - getChangePercent(b));
    return all;
  }, [quotes, sort]);

  const visibleNews = showAllNews ? news.slice(0, 6) : news.slice(0, 1);

  return (
    <Screen scroll>
      <ScreenHeader title="Rynek" subtitle={firstName ? `Cześć, ${firstName} 👋` : 'Witaj 👋'} />

      <PortfolioSummaryCard portfolio={portfolio} totalValue={totalValue} onPress={() => router.navigate('/wallet')} />

      <View style={[styles.status, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
          style={[styles.pauseButton, { backgroundColor: colors.primarySoft }]}
        >
          <Ionicons name={settings.paused ? 'play' : 'pause'} size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Wiadomości rynkowe</Text>
        {news.length > 1 ? (
          <Pressable onPress={() => setShowAllNews((v) => !v)} hitSlop={8}>
            <Text style={[styles.sectionAction, { color: colors.primary }]}>{showAllNews ? 'Zwiń' : `Więcej (${news.length})`}</Text>
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

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Kursy walut</Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>PLN za 1 jednostkę</Text>
      </View>
      <SegmentedControl options={SORT_OPTIONS} value={sort} onChange={setSort} style={styles.sort} />
      {list.map((quote) => (
        <CurrencyRow key={quote.code} quote={quote} onPress={() => router.push(`/currency/${quote.code}`)} />
      ))}
      {list.length === 0 ? (
        <Text style={[styles.emptyList, { color: colors.textMuted }]}>Brak walut w tej kategorii.</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingLeft: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
  },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 14.5, fontWeight: '700' },
  statusSub: { fontSize: 12, marginTop: 2 },
  pauseButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  sectionAction: { fontSize: 14, fontWeight: '700' },
  sectionHint: { fontSize: 12.5 },
  noNews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noNewsText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  sort: { marginBottom: 12 },
  emptyList: { textAlign: 'center', paddingVertical: 20 },
});

import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import AppButton from '../../../components/AppButton';
import Card from '../../../components/Card';
import ChangeBadge from '../../../components/ChangeBadge';
import CurrencyAvatar from '../../../components/CurrencyAvatar';
import LineChart from '../../../components/LineChart';
import NewsItem from '../../../components/NewsItem';
import Screen from '../../../components/Screen';
import ScreenHeader from '../../../components/ScreenHeader';
import SegmentedControl from '../../../components/SegmentedControl';
import TextField from '../../../components/TextField';
import { useToast } from '../../../components/Toast';
import { useMarket } from '../../../context/MarketContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { usePortfolio } from '../../../context/PortfolioContext';
import { BASE_CURRENCY, floor2, getBalance, getMaxBuyAmount, round2 } from '../../../logic/trading';
import { getCurrency } from '../../../simulation/currencies';
import { getAskPrice, getBidPrice, getChangePercent } from '../../../simulation/marketEngine';
import { getErrorMessage } from '../../../services/authService';
import { useAppTheme } from '../../../theme/ThemeContext';
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatRate,
  formatSignedMoney,
  parseAmount,
} from '../../../utils/format';

const QUICK_AMOUNTS = [0.25, 0.5, 0.75, 1];

export default function CurrencyScreen() {
  const { code } = useLocalSearchParams();
  const currency = getCurrency(String(code).toUpperCase());
  if (!currency) return <Redirect href="/" />;
  return <CurrencyDetails currency={currency} />;
}

function CurrencyDetails({ currency }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { quotes, news } = useMarket();
  const { portfolio, trade } = usePortfolio();
  const { showToast } = useToast();
  const { width, isDesktop } = useResponsive();
  const twoColumns = isDesktop;
  const statsInOneRow = width >= 1400;

  const [side, setSide] = useState('buy');
  const [inputMode, setInputMode] = useState('units'); // 'units' = w walucie, 'pln' = w złotówkach
  const [amountText, setAmountText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quote = quotes[currency.code];
  const ask = getAskPrice(quote);
  const bid = getBidPrice(quote);
  const rate = side === 'buy' ? ask : bid;
  const change = getChangePercent(quote);
  const trendColor = change >= 0 ? colors.up : colors.down;

  const cash = getBalance(portfolio, BASE_CURRENCY);
  const held = getBalance(portfolio, currency.code);
  const avgPrice = portfolio?.avgPrices?.[currency.code];
  const positionValue = held * bid;
  const positionPnl = avgPrice ? (bid - avgPrice) * held : 0;

  // Przeliczenie wpisanej kwoty na liczbę jednostek waluty.
  const parsed = parseAmount(amountText);
  const units = Number.isFinite(parsed) ? (inputMode === 'units' ? round2(parsed) : floor2(parsed / rate)) : 0;
  const total = round2(units * rate);

  let validationError = null;
  if (amountText && !Number.isFinite(parsed)) validationError = 'Wpisz poprawną liczbę, np. 150,50.';
  else if (side === 'buy' && total > cash)
    validationError = `Brakuje ${formatMoney(total - cash)} — masz ${formatMoney(cash)}.`;
  else if (side === 'sell' && units > held) validationError = `Masz tylko ${formatNumber(held)} ${currency.code}.`;
  else if (amountText && units <= 0) validationError = 'Kwota jest za mała.';

  const canSubmit = units > 0 && !validationError && !submitting && Boolean(portfolio);

  function setQuickAmount(fraction) {
    const maxUnits = side === 'buy' ? getMaxBuyAmount(portfolio, ask) : held;
    const value = fraction === 1 ? maxUnits : floor2(maxUnits * fraction);
    setAmountText(inputMode === 'units' ? String(value) : String(floor2(value * rate)));
  }

  function changeInputMode(mode) {
    if (mode === inputMode) return;
    if (units > 0) setAmountText(mode === 'units' ? String(units) : String(round2(units * rate)));
    setInputMode(mode);
  }

  async function handleTrade() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await trade({ type: side, code: currency.code, amount: units, rate });
      setAmountText('');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const verb = side === 'buy' ? 'Kupiono' : 'Sprzedano';
      const pnlInfo = side === 'sell' && result.pnl ? ` (wynik ${formatSignedMoney(result.pnl)})` : '';
      showToast(`${verb} ${formatNumber(result.amount)} ${currency.code} za ${formatMoney(result.total)}${pnlInfo}`);
    } catch (error) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showToast(getErrorMessage(error), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const relatedNews = news.filter((n) => n.impacts[currency.code] !== undefined).slice(0, 3);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const priceCard = (
    <Card>
      <View style={styles.priceRow}>
        <CurrencyAvatar code={currency.code} size={52} />
        <View style={styles.priceInfo}>
          <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Kurs średni</Text>
          <Text style={[styles.price, { color: colors.text }]}>{formatRate(quote.mid)} zł</Text>
        </View>
        <View style={styles.changeBox}>
          <ChangeBadge value={change} />
          <Text style={[styles.changeHint, { color: colors.textSubtle }]}>od otwarcia</Text>
        </View>
      </View>
      <View style={styles.chart}>
        <LineChart data={quote.history} color={trendColor} height={twoColumns ? 300 : 220} />
      </View>
      <View style={styles.statsGrid}>
        <Stat wide={statsInOneRow} label="Kupisz po" value={formatRate(ask)} color={colors.up} />
        <Stat wide={statsInOneRow} label="Sprzedasz po" value={formatRate(bid)} color={colors.down} />
        <Stat wide={statsInOneRow} label="Spread" value={formatPercent(quote.spread * 100, { sign: false })} />
        <Stat wide={statsInOneRow} label="Otwarcie" value={formatRate(quote.open)} />
        <Stat wide={statsInOneRow} label="Max sesji" value={formatRate(quote.high)} />
        <Stat wide={statsInOneRow} label="Min sesji" value={formatRate(quote.low)} />
      </View>
    </Card>
  );

  const positionCard =
    held > 0 ? (
      <Card style={styles.section}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Twoja pozycja</Text>
        <View style={styles.positionRow}>
          <View>
            <Text style={[styles.positionAmount, { color: colors.text }]}>
              {formatNumber(held)} {currency.code}
            </Text>
            <Text style={[styles.muted, { color: colors.textMuted }]}>
              ≈ {formatMoney(positionValue)} · śr. kurs zakupu {avgPrice ? formatRate(avgPrice) : '—'}
            </Text>
          </View>
          <Text style={[styles.positionPnl, { color: positionPnl >= 0 ? colors.up : colors.down }]}>
            {formatSignedMoney(positionPnl)}
          </Text>
        </View>
      </Card>
    ) : null;

  const tradeCard = (
    <Card style={!twoColumns && styles.section}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Złóż zlecenie</Text>
      <SegmentedControl
        options={[
          { value: 'buy', label: 'Kup' },
          { value: 'sell', label: 'Sprzedaj' },
        ]}
        value={side}
        onChange={(value) => {
          setSide(value);
          setAmountText('');
        }}
        activeColors={{ buy: colors.up, sell: colors.down }}
      />

      <View style={styles.balanceRow}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>
          {side === 'buy' ? 'Dostępne środki:' : 'Dostępne do sprzedaży:'}
        </Text>
        <Text style={[styles.balanceValue, { color: colors.text }]}>
          {side === 'buy' ? formatMoney(cash) : `${formatNumber(held)} ${currency.code}`}
        </Text>
      </View>

      <View style={styles.modeRow}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>Kwota w:</Text>
        {['units', 'pln'].map((mode) => {
          const active = inputMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => changeInputMode(mode)}
              style={[
                styles.modeChip,
                {
                  backgroundColor: active ? colors.primarySoft : 'transparent',
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.modeText, { color: active ? colors.primary : colors.textMuted }]}>
                {mode === 'units' ? currency.code : 'PLN'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextField
        placeholder="0,00"
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        icon="cash-outline"
        error={validationError}
        returnKeyType="done"
        onSubmitEditing={handleTrade}
        style={styles.amountField}
      />

      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map((fraction) => (
          <Pressable
            key={fraction}
            onPress={() => setQuickAmount(fraction)}
            style={({ pressed, hovered }) => [
              styles.quick,
              {
                backgroundColor: pressed || hovered ? colors.elevated : colors.surfaceAlt,
                borderColor: hovered ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.quickText, { color: colors.text }]}>
              {fraction === 1 ? 'MAX' : `${fraction * 100}%`}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.summary, { backgroundColor: colors.surfaceAlt }]}>
        <SummaryRow label="Kurs transakcji" value={`${formatRate(rate)} zł`} />
        <SummaryRow label="Ilość" value={`${formatNumber(units)} ${currency.code}`} />
        <SummaryRow label={side === 'buy' ? 'Zapłacisz' : 'Otrzymasz'} value={formatMoney(total)} bold />
      </View>

      <AppButton
        title={side === 'buy' ? `Kup ${currency.code}` : `Sprzedaj ${currency.code}`}
        icon={side === 'buy' ? 'arrow-down' : 'arrow-up'}
        variant={side === 'buy' ? 'success' : 'danger'}
        onPress={handleTrade}
        loading={submitting}
        disabled={!canSubmit}
      />
      <Text style={[styles.disclaimer, { color: colors.textSubtle }]}>
        Kurs zmienia się na żywo — transakcja zostanie wykonana po kursie z chwili kliknięcia.
      </Text>
    </Card>
  );

  const newsSection = relatedNews.length ? (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Wiadomości o {currency.code}</Text>
      {relatedNews.map((item) => (
        <NewsItem key={item.id} news={item} />
      ))}
    </View>
  ) : null;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title={`${currency.code}/PLN`} subtitle={currency.name} onBack={goBack} />
      {twoColumns ? (
        <View style={styles.columns}>
          <View style={styles.mainColumn}>
            {priceCard}
            {positionCard}
            {newsSection}
          </View>
          <View style={styles.sideColumn}>{tradeCard}</View>
        </View>
      ) : (
        <>
          {priceCard}
          {positionCard}
          {tradeCard}
          {newsSection}
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, color, wide }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.stat, wide && styles.statWide, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color ?? colors.text }]}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value, bold }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }, bold && styles.summaryBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  mainColumn: { flex: 1, minWidth: 0 },
  sideColumn: { width: 400 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInfo: { flex: 1 },
  priceLabel: { fontSize: 13, fontWeight: '600' },
  price: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  changeBox: { alignItems: 'flex-end', gap: 4 },
  changeHint: { fontSize: 11 },
  chart: { marginTop: 16, marginHorizontal: -4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  stat: { flexGrow: 1, flexBasis: '30%', borderRadius: 12, padding: 10 },
  statWide: { flexBasis: '15%', padding: 12 },
  statLabel: { fontSize: 11.5, fontWeight: '600' },
  statValue: { fontSize: 14.5, fontWeight: '800', marginTop: 3, fontVariant: ['tabular-nums'] },
  section: { marginTop: 16 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  positionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  positionAmount: { fontSize: 20, fontWeight: '800' },
  positionPnl: { fontSize: 16, fontWeight: '800' },
  muted: { fontSize: 13.5 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  balanceValue: { fontSize: 15, fontWeight: '800' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
  modeChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  modeText: { fontSize: 13, fontWeight: '700' },
  amountField: { marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  quickText: { fontSize: 13, fontWeight: '700' },
  summary: { borderRadius: 14, padding: 14, marginVertical: 16, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  summaryBold: { fontSize: 16, fontWeight: '800' },
  disclaimer: { fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 17 },
});

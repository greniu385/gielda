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
import {
  BASE_CURRENCY,
  applyTrade,
  floor2,
  getBalance,
  getMaxAffordableAmount,
  getShort,
  round2,
} from '../../../logic/trading';
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
import { fonts } from '../../../theme/fonts';

const QUICK_AMOUNTS = [0.25, 0.5, 0.75, 1];

// Rodzaje zleceń w dwóch kierunkach: na wzrost (kupno/sprzedaż) i na spadek (krótka sprzedaż).
const DIRECTIONS = [
  { value: 'long', label: 'Na wzrost' },
  { value: 'short', label: 'Na spadek' },
];
const ACTIONS = {
  long: [
    { value: 'buy', label: 'Kup' },
    { value: 'sell', label: 'Sprzedaj' },
  ],
  short: [
    { value: 'short', label: 'Otwórz short' },
    { value: 'cover', label: 'Zamknij short' },
  ],
};

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

  const [direction, setDirection] = useState('long');
  const [side, setSide] = useState('buy'); // 'buy' | 'sell' | 'short' | 'cover'
  const [inputMode, setInputMode] = useState('units'); // 'units' = w walucie, 'pln' = w złotówkach
  const [amountText, setAmountText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const quote = quotes[currency.code];
  const ask = getAskPrice(quote);
  const bid = getBidPrice(quote);
  // Kupujemy (buy, cover) po kursie kupna, sprzedajemy (sell, short) po kursie sprzedaży.
  const rate = side === 'buy' || side === 'cover' ? ask : bid;
  const change = getChangePercent(quote);
  const trendColor = change >= 0 ? colors.up : colors.down;

  const cash = getBalance(portfolio, BASE_CURRENCY);
  const held = getBalance(portfolio, currency.code);
  const avgPrice = portfolio?.avgPrices?.[currency.code];
  const positionValue = held * bid;
  const positionPnl = avgPrice ? (bid - avgPrice) * held : 0;
  const shortPosition = getShort(portfolio, currency.code);
  const shortAmount = shortPosition?.amount ?? 0;
  const shortPnl = shortPosition ? Math.max((shortPosition.entryPrice - ask) * shortAmount, -shortPosition.margin) : 0;

  // Przeliczenie wpisanej kwoty na liczbę jednostek waluty.
  const parsed = parseAmount(amountText);
  const units = Number.isFinite(parsed) ? (inputMode === 'units' ? round2(parsed) : floor2(parsed / rate)) : 0;
  const total = round2(units * rate);

  let validationError = null;
  if (amountText && !Number.isFinite(parsed)) validationError = 'Wpisz poprawną liczbę, np. 150,50.';
  else if ((side === 'buy' || side === 'short') && total > cash)
    validationError = `Brakuje ${formatMoney(total - cash)} — masz ${formatMoney(cash)}.`;
  else if (side === 'sell' && units > held) validationError = `Masz tylko ${formatNumber(held)} ${currency.code}.`;
  else if (side === 'cover' && units > shortAmount)
    validationError = `Twoja krótka pozycja to ${formatNumber(shortAmount)} ${currency.code}.`;
  else if (amountText && units <= 0) validationError = 'Kwota jest za mała.';

  // Podgląd transakcji liczony tą samą funkcją, której używa serwer (kwota, wynik).
  let preview = null;
  if (!validationError && units > 0 && portfolio) {
    try {
      preview = applyTrade(portfolio, { type: side, code: currency.code, amount: units, rate }).transaction;
    } catch (error) {
      validationError = error.message;
    }
  }

  const canSubmit = Boolean(preview) && !submitting;

  function maxUnitsFor(type) {
    if (type === 'buy') return getMaxAffordableAmount(portfolio, ask);
    if (type === 'short') return getMaxAffordableAmount(portfolio, bid);
    if (type === 'sell') return held;
    return shortAmount;
  }

  function setQuickAmount(fraction) {
    const maxUnits = maxUnitsFor(side);
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
      showToast(describeTrade(result, currency.code));
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
    held > 0 || shortPosition ? (
      <Card style={styles.section}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Twoje pozycje</Text>
        {held > 0 ? (
          <PositionRow
            label="Długa (na wzrost)"
            color={colors.up}
            amount={`${formatNumber(held)} ${currency.code}`}
            details={`≈ ${formatMoney(positionValue)} · śr. kurs zakupu ${avgPrice ? formatRate(avgPrice) : '—'}`}
            pnl={positionPnl}
          />
        ) : null}
        {shortPosition ? (
          <PositionRow
            label="Krótka (na spadek)"
            color={colors.short}
            amount={`${formatNumber(shortAmount)} ${currency.code}`}
            details={`kurs otwarcia ${formatRate(shortPosition.entryPrice)} · depozyt ${formatMoney(shortPosition.margin)}`}
            pnl={shortPnl}
          />
        ) : null}
      </Card>
    ) : null;

  const tradeCard = (
    <Card style={!twoColumns && styles.section}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Złóż zlecenie</Text>
      <SegmentedControl
        options={DIRECTIONS}
        value={direction}
        onChange={(value) => {
          setDirection(value);
          setSide(ACTIONS[value][0].value);
          setAmountText('');
        }}
        activeColors={{ long: colors.up, short: colors.short }}
      />
      <SegmentedControl
        options={ACTIONS[direction]}
        value={side}
        onChange={(value) => {
          setSide(value);
          setAmountText('');
        }}
        activeColors={{ buy: colors.up, sell: colors.down, short: colors.short }}
        style={styles.actions}
      />

      {direction === 'short' ? (
        <View style={[styles.explain, { backgroundColor: colors.shortSoft, borderColor: colors.short }]}>
          <Text style={[styles.explainText, { color: colors.text }]}>
            Gra na spadek: sprzedajesz pożyczoną walutę po kursie sprzedaży i odkupujesz ją później po kursie kupna.
            Zarabiasz, gdy kurs spadnie. Na czas trwania pozycji blokujemy depozyt równy jej wartości.
          </Text>
        </View>
      ) : null}

      <View style={styles.balanceRow}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>{AVAILABLE_LABEL[side]}</Text>
        <Text style={[styles.balanceValue, { color: colors.text }]}>
          {side === 'buy' || side === 'short'
            ? formatMoney(cash)
            : `${formatNumber(side === 'sell' ? held : shortAmount)} ${currency.code}`}
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
        {(side === 'sell' || side === 'cover') && preview ? (
          <SummaryRow
            label="Wynik transakcji"
            value={formatSignedMoney(preview.pnl)}
            color={preview.pnl >= 0 ? colors.up : colors.down}
          />
        ) : null}
        <SummaryRow label={TOTAL_LABEL[side]} value={formatMoney(preview?.total ?? total)} bold />
      </View>

      <AppButton
        title={`${BUTTON[side].label} ${currency.code}`}
        icon={BUTTON[side].icon}
        variant={BUTTON[side].variant}
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

const AVAILABLE_LABEL = {
  buy: 'Dostępne środki:',
  sell: 'Dostępne do sprzedaży:',
  short: 'Dostępne na depozyt:',
  cover: 'Otwarta pozycja krótka:',
};

const TOTAL_LABEL = {
  buy: 'Zapłacisz',
  sell: 'Otrzymasz',
  short: 'Zablokowany depozyt',
  cover: 'Otrzymasz (depozyt ± wynik)',
};

const BUTTON = {
  buy: { label: 'Kup', icon: 'arrow-down', variant: 'success' },
  sell: { label: 'Sprzedaj', icon: 'arrow-up', variant: 'danger' },
  short: { label: 'Otwórz short', icon: 'trending-down', variant: 'short' },
  cover: { label: 'Zamknij short', icon: 'checkmark-done', variant: 'primary' },
};

function describeTrade(t, code) {
  const amount = `${formatNumber(t.amount)} ${code}`;
  const result = t.pnl ? ` (wynik ${formatSignedMoney(t.pnl)})` : '';
  if (t.type === 'buy') return `Kupiono ${amount} za ${formatMoney(t.total)}`;
  if (t.type === 'sell') return `Sprzedano ${amount} za ${formatMoney(t.total)}${result}`;
  if (t.type === 'short') return `Otwarto krótką pozycję ${amount}, depozyt ${formatMoney(t.total)}`;
  return `Zamknięto krótką pozycję ${amount}${result}`;
}

function PositionRow({ label, color, amount, details, pnl }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.positionRow}>
      <View style={[styles.positionMarker, { backgroundColor: color }]} />
      <View style={styles.positionInfo}>
        <Text style={[styles.positionLabel, { color }]}>{label.toUpperCase()}</Text>
        <Text style={[styles.positionAmount, { color: colors.text }]}>{amount}</Text>
        <Text style={[styles.muted, { color: colors.textMuted }]}>{details}</Text>
      </View>
      <Text style={[styles.positionPnl, { color: pnl >= 0 ? colors.up : colors.down }]}>{formatSignedMoney(pnl)}</Text>
    </View>
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

function SummaryRow({ label, value, bold, color }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: color ?? colors.text }, bold && styles.summaryBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  mainColumn: { flex: 1, minWidth: 0 },
  sideColumn: { width: 400 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInfo: { flex: 1 },
  priceLabel: { fontSize: 13, fontFamily: fonts.semibold },
  price: { fontSize: 30, fontFamily: fonts.monoBold, letterSpacing: -0.8 },
  changeBox: { alignItems: 'flex-end', gap: 4 },
  changeHint: { fontSize: 11, fontFamily: fonts.regular },
  chart: { marginTop: 16, marginHorizontal: -4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  stat: { flexGrow: 1, flexBasis: '30%', borderRadius: 8, padding: 10 },
  statWide: { flexBasis: '15%', padding: 12 },
  statLabel: { fontSize: 11.5, fontFamily: fonts.semibold },
  statValue: { fontSize: 14.5, fontFamily: fonts.monoBold, marginTop: 3 },
  section: { marginTop: 16 },
  cardTitle: { fontSize: 17, fontFamily: fonts.bold, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontFamily: fonts.bold, marginBottom: 12 },
  positionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  positionMarker: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  positionInfo: { flex: 1, minWidth: 0 },
  positionLabel: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1 },
  positionAmount: { fontSize: 19, fontFamily: fonts.monoBold, marginTop: 2 },
  positionPnl: { fontSize: 16, fontFamily: fonts.monoBold },
  actions: { marginTop: 8 },
  explain: { borderRadius: 8, borderLeftWidth: 3, padding: 12, marginTop: 12 },
  explainText: { fontSize: 13, fontFamily: fonts.regular, lineHeight: 19 },
  muted: { fontSize: 13.5, fontFamily: fonts.regular },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  balanceValue: { fontSize: 15, fontFamily: fonts.monoBold },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
  modeChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  modeText: { fontSize: 13, fontFamily: fonts.bold },
  amountField: { marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  quickText: { fontSize: 13, fontFamily: fonts.monoBold },
  summary: { borderRadius: 10, padding: 14, marginVertical: 16, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontFamily: fonts.regular },
  summaryValue: { fontSize: 14, fontFamily: fonts.monoMedium },
  summaryBold: { fontSize: 16, fontFamily: fonts.monoBold },
  disclaimer: { fontSize: 12, fontFamily: fonts.regular, textAlign: 'center', marginTop: 10, lineHeight: 17 },
});

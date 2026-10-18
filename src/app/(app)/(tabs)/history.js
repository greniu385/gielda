import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../../components/AppButton';
import EmptyState from '../../../components/EmptyState';
import Screen from '../../../components/Screen';
import ScreenHeader from '../../../components/ScreenHeader';
import SegmentedControl from '../../../components/SegmentedControl';
import { usePortfolio } from '../../../context/PortfolioContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { useAppTheme } from '../../../theme/ThemeContext';
import { formatDateTime, formatMoney, formatNumber, formatRate, formatSignedMoney } from '../../../utils/format';
import { fonts } from '../../../theme/fonts';

const FILTERS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'buy', label: 'Kupno' },
  { value: 'sell', label: 'Sprzedaż' },
  { value: 'shorts', label: 'Short' },
];

const FILTER_TYPES = { buy: ['buy'], sell: ['sell'], shorts: ['short', 'cover'] };

// Opis każdego typu transakcji: nazwa, ikona, kolor oraz znak zmiany waluty i złotówek.
// Przy otwarciu shorta waluta jest "pożyczona" (−), a złotówki trafiają do depozytu (−).
const TYPE_INFO = {
  buy: { label: 'Kupno', icon: 'arrow-down', color: 'up', units: '+', cash: '−' },
  sell: { label: 'Sprzedaż', icon: 'arrow-up', color: 'down', units: '−', cash: '+' },
  short: { label: 'Short', icon: 'trending-down', color: 'short', units: '−', cash: '−' },
  cover: { label: 'Zamknięcie short', icon: 'checkmark-done', color: 'primary', units: '+', cash: '+' },
};

const hasResult = (t) => t.type === 'sell' || t.type === 'cover';

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { isWide } = useResponsive();
  const { transactions } = usePortfolio();
  const [filter, setFilter] = useState('all');

  const list = filter === 'all' ? transactions : transactions.filter((t) => FILTER_TYPES[filter].includes(t.type));
  const volume = list.reduce((sum, t) => sum + t.total, 0);

  return (
    <Screen scroll>
      <ScreenHeader title="Historia" subtitle="Twoje transakcje" />
      <View style={isWide && styles.toolbar}>
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} style={isWide && styles.filtersWide} />
        {list.length ? (
          <View style={[styles.summary, isWide && styles.summaryWide, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.summaryText, { color: colors.primary }]}>
              {list.length} {pluralizeTransactions(list.length)} · obrót {formatMoney(volume)}
            </Text>
          </View>
        ) : null}
      </View>

      {isWide && list.length ? (
        <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TableHeader />
          {list.map((t) => (
            <TableRow key={t.id} transaction={t} />
          ))}
        </View>
      ) : (
        list.map((t) => <TransactionRow key={t.id} transaction={t} />)
      )}

      {list.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Brak transakcji"
          message={
            filter === 'all'
              ? 'Tutaj pojawi się historia Twoich zakupów i sprzedaży walut.'
              : 'Brak transakcji tego typu.'
          }
        >
          {filter === 'all' ? (
            <AppButton title="Zacznij handlować" icon="swap-vertical" onPress={() => router.navigate('/')} small />
          ) : null}
        </EmptyState>
      ) : null}
    </Screen>
  );
}

function TransactionRow({ transaction: t }) {
  const { colors } = useAppTheme();
  const info = TYPE_INFO[t.type];
  const accent = colors[info.color];

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={info.icon} size={18} color={accent} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]}>
          {info.label} {t.code}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {formatDateTime(t.createdAt)} · kurs {formatRate(t.rate)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: accent }]}>
          {info.units}
          {formatNumber(t.amount)} {t.code}
        </Text>
        <Text style={[styles.total, { color: colors.textMuted }]}>
          {info.cash}
          {formatMoney(t.total)}
        </Text>
        {hasResult(t) && t.pnl ? (
          <Text style={[styles.pnl, { color: t.pnl >= 0 ? colors.up : colors.down }]}>
            wynik {formatSignedMoney(t.pnl)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Wersja tabelaryczna historii na komputer.
const COLUMNS = [
  { key: 'type', label: 'TYP', flex: 1.3 },
  { key: 'date', label: 'DATA', flex: 1.3 },
  { key: 'amount', label: 'ILOŚĆ', flex: 1, align: 'right' },
  { key: 'rate', label: 'KURS', flex: 1, align: 'right' },
  { key: 'total', label: 'WARTOŚĆ', flex: 1.1, align: 'right' },
  { key: 'pnl', label: 'WYNIK', flex: 1, align: 'right' },
];

function TableHeader() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: colors.border }]}>
      {COLUMNS.map((c) => (
        <Text
          key={c.key}
          style={[styles.headerLabel, { flex: c.flex, textAlign: c.align ?? 'left', color: colors.textSubtle }]}
        >
          {c.label}
        </Text>
      ))}
    </View>
  );
}

function TableRow({ transaction: t }) {
  const { colors } = useAppTheme();
  const info = TYPE_INFO[t.type];
  const accent = colors[info.color];
  const cell = (key) => {
    const column = COLUMNS.find((c) => c.key === key);
    return [styles.cellText, { flex: column.flex, textAlign: column.align ?? 'left', color: colors.text }];
  };

  return (
    <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.typeCell, { flex: 1.3 }]}>
        <View style={[styles.iconSmall, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name={info.icon} size={15} color={accent} />
        </View>
        <Text style={[styles.typeText, { color: colors.text }]}>
          {info.label} {t.code}
        </Text>
      </View>
      <Text style={[cell('date'), { color: colors.textMuted }]}>{formatDateTime(t.createdAt)}</Text>
      <Text style={[cell('amount'), styles.cellStrong, { color: accent }]}>
        {info.units}
        {formatNumber(t.amount)} {t.code}
      </Text>
      <Text style={cell('rate')}>{formatRate(t.rate)}</Text>
      <Text style={cell('total')}>
        {info.cash}
        {formatMoney(t.total)}
      </Text>
      <Text
        style={[
          cell('pnl'),
          styles.cellStrong,
          { color: !hasResult(t) ? colors.textSubtle : t.pnl >= 0 ? colors.up : colors.down },
        ]}
      >
        {hasResult(t) ? formatSignedMoney(t.pnl ?? 0) : '—'}
      </Text>
    </View>
  );
}

function pluralizeTransactions(n) {
  if (n === 1) return 'transakcja';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'transakcje';
  return 'transakcji';
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  filtersWide: { width: 460 },
  summaryWide: { marginTop: 0, marginBottom: 0 },
  table: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeader: { paddingVertical: 12 },
  headerLabel: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.8 },
  typeCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconSmall: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 14, fontFamily: fonts.mono },
  typeText: { fontSize: 14, fontFamily: fonts.bold },
  cellStrong: { fontFamily: fonts.monoBold },
  summary: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginTop: 14, marginBottom: 4 },
  summaryText: { fontSize: 13.5, fontFamily: fonts.bold, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  icon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontFamily: fonts.bold },
  sub: { fontSize: 12, fontFamily: fonts.regular, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14.5, fontFamily: fonts.monoBold },
  total: { fontSize: 12.5, fontFamily: fonts.mono, marginTop: 2 },
  pnl: { fontSize: 11.5, fontFamily: fonts.monoBold, marginTop: 2 },
});

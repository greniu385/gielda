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
import { useAppTheme } from '../../../theme/ThemeContext';
import { formatDateTime, formatMoney, formatNumber, formatRate, formatSignedMoney } from '../../../utils/format';

const FILTERS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'buy', label: 'Kupno' },
  { value: 'sell', label: 'Sprzedaż' },
];

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { transactions } = usePortfolio();
  const [filter, setFilter] = useState('all');

  const list = filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);
  const volume = list.reduce((sum, t) => sum + t.total, 0);

  return (
    <Screen scroll>
      <ScreenHeader title="Historia" subtitle="Twoje transakcje" />
      <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />

      {list.length ? (
        <View style={[styles.summary, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.summaryText, { color: colors.primary }]}>
            {list.length} {pluralizeTransactions(list.length)} · obrót {formatMoney(volume)}
          </Text>
        </View>
      ) : null}

      {list.map((t) => (
        <TransactionRow key={t.id} transaction={t} />
      ))}

      {list.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Brak transakcji"
          message={filter === 'all' ? 'Tutaj pojawi się historia Twoich zakupów i sprzedaży walut.' : 'Brak transakcji tego typu.'}
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
  const isBuy = t.type === 'buy';
  const accent = isBuy ? colors.up : colors.down;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: isBuy ? colors.upSoft : colors.downSoft }]}>
        <Ionicons name={isBuy ? 'arrow-down' : 'arrow-up'} size={18} color={accent} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isBuy ? 'Kupno' : 'Sprzedaż'} {t.code}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {formatDateTime(t.createdAt)} · kurs {formatRate(t.rate)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: accent }]}>
          {isBuy ? '+' : '−'}
          {formatNumber(t.amount)} {t.code}
        </Text>
        <Text style={[styles.total, { color: colors.textMuted }]}>
          {isBuy ? '−' : '+'}
          {formatMoney(t.total)}
        </Text>
        {!isBuy && t.pnl ? (
          <Text style={[styles.pnl, { color: t.pnl >= 0 ? colors.up : colors.down }]}>wynik {formatSignedMoney(t.pnl)}</Text>
        ) : null}
      </View>
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
  summary: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 14, marginBottom: 4 },
  summaryText: { fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  total: { fontSize: 12.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  pnl: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
});

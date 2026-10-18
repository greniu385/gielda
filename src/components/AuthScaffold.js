import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useMarket } from '../context/MarketContext';
import { useResponsive } from '../hooks/useResponsive';
import { STARTING_BALANCE } from '../logic/trading';
import { getChangePercent } from '../simulation/marketEngine';
import { useAppTheme } from '../theme/ThemeContext';
import { formatMoney, formatPercent, formatRate } from '../utils/format';
import Card from './Card';
import CurrencyAvatar from './CurrencyAvatar';
import LiveTicker from './LiveTicker';
import PageTitle from './PageTitle';
import Sparkline from './Sparkline';
import ThemeToggle from './ThemeToggle';

const FEATURES = [
  { icon: 'cash-outline', text: `${formatMoney(STARTING_BALANCE)} wirtualnych środków na start` },
  { icon: 'pulse', text: 'Kursy zmieniają się na żywo — symulacja rynku z wiadomościami' },
  { icon: 'server-outline', text: 'Konta, portfel i historia w lokalnej bazie danych SQLite' },
];

const HERO_CODES = ['USD', 'EUR', 'GBP', 'CHF'];

// Wspólny wygląd ekranów logowania, rejestracji i resetu hasła.
// Na komputerze ekran jest podzielony: po lewej panel z opisem, po prawej formularz.
export default function AuthScaffold({ title, subtitle, children, footer, pageTitle }) {
  const { colors, isDark } = useAppTheme();
  const { isWide } = useResponsive();

  const form = (
    <>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      <Card style={styles.card}>{children}</Card>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  if (isWide) {
    return (
      <View style={[styles.split, { backgroundColor: colors.background }]}>
        <PageTitle title={pageTitle ?? title} />
        <HeroPanel />
        <ScrollView style={styles.formSide} contentContainerStyle={styles.formSideContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formTopBar}>
            <ThemeToggle showLabel />
          </View>
          <View style={styles.formBox}>{form}</View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <PageTitle title={pageTitle ?? title} />
      <LinearGradient
        colors={isDark ? ['#1A2150', colors.background] : ['#DCE3FF', colors.background]}
        style={styles.glow}
      />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.topBar}>
              <Brand />
              <ThemeToggle />
            </View>
            <LiveTicker codes={['USD', 'EUR', 'GBP', 'CHF', 'JPY']} />
            {form}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Brand({ light = false }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.brand}>
      <LinearGradient colors={light ? ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)'] : colors.gradient} style={styles.logo}>
        <Ionicons name="trending-up" size={22} color="#FFFFFF" />
      </LinearGradient>
      <Text style={[styles.brandName, { color: light ? '#FFFFFF' : colors.text }]}>Giełda Walut</Text>
    </View>
  );
}

// Lewy panel na komputerze: opis aplikacji i kursy na żywo.
function HeroPanel() {
  const { colors } = useAppTheme();
  const { quotes } = useMarket();

  return (
    <LinearGradient colors={colors.heroGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={[styles.decor, styles.decorTop]} />
      <View style={[styles.decor, styles.decorBottom]} />
      <ScrollView contentContainerStyle={styles.heroContent} showsVerticalScrollIndicator={false}>
        <Brand light />
        <Text style={styles.heroTitle}>Handluj walutami{'\n'}na symulowanym rynku</Text>
        <Text style={styles.heroText}>
          Kupuj i sprzedawaj dolary, euro czy franki, obserwuj wykresy i reaguj na wiadomości z rynku — bez ryzyka
          utraty prawdziwych pieniędzy.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ratesCard}>
          <Text style={styles.ratesTitle}>Kursy na żywo</Text>
          {HERO_CODES.map((code) => {
            const quote = quotes[code];
            const change = getChangePercent(quote);
            return (
              <View key={code} style={styles.rateRow}>
                <CurrencyAvatar code={code} size={34} />
                <Text style={styles.rateCode}>{code}/PLN</Text>
                <Sparkline data={quote.history.slice(-50)} color="#FFFFFF" width={110} height={30} />
                <Text style={styles.rateValue}>{formatRate(quote.mid)}</Text>
                <Text style={[styles.rateChange, { color: change >= 0 ? '#7CF2B1' : '#FFB3C1' }]}>
                  {formatPercent(change)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 40, width: '100%', maxWidth: 480, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  heading: { marginTop: 28, marginBottom: 18 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15.5, lineHeight: 22, marginTop: 6 },
  card: { padding: 20 },
  footer: { marginTop: 20, alignItems: 'center' },

  // Układ na komputer
  split: { flex: 1, flexDirection: 'row' },
  hero: { flex: 1.1, overflow: 'hidden' },
  heroContent: { flexGrow: 1, justifyContent: 'center', padding: 56, maxWidth: 680 },
  decor: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  decorTop: { width: 420, height: 420, top: -160, right: -120 },
  decorBottom: { width: 300, height: 300, bottom: -120, left: -80 },
  heroTitle: { color: '#FFFFFF', fontSize: 44, lineHeight: 52, fontWeight: '800', letterSpacing: -1.2, marginTop: 40 },
  heroText: { color: 'rgba(255,255,255,0.82)', fontSize: 16.5, lineHeight: 25, marginTop: 16, maxWidth: 520 },
  features: { gap: 14, marginTop: 32 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  featureText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1 },
  ratesCard: {
    marginTop: 36,
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(8, 12, 30, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 12,
    maxWidth: 520,
  },
  ratesTitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontWeight: '800', letterSpacing: 0.8 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rateCode: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800', flex: 1 },
  rateValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', width: 72, textAlign: 'right', fontVariant: ['tabular-nums'] },
  rateChange: { fontSize: 13, fontWeight: '700', width: 64, textAlign: 'right', fontVariant: ['tabular-nums'] },
  formSide: { flex: 1 },
  formSideContent: { flexGrow: 1, padding: 32 },
  formTopBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  formBox: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 440, alignSelf: 'center', paddingVertical: 24 },
});

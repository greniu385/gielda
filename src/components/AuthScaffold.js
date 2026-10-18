import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useMarket } from '../context/MarketContext';
import { useResponsive } from '../hooks/useResponsive';
import { STARTING_BALANCE } from '../logic/trading';
import { getChangePercent } from '../simulation/marketEngine';
import { darkColors } from '../theme/colors';
import { useAppTheme } from '../theme/ThemeContext';
import { formatMoney, formatPercent, formatRate } from '../utils/format';
import Card from './Card';
import CurrencyAvatar from './CurrencyAvatar';
import LiveTicker from './LiveTicker';
import Logo from './Logo';
import PageTitle from './PageTitle';
import Sparkline from './Sparkline';
import ThemeToggle from './ThemeToggle';
import { fonts } from '../theme/fonts';

const FEATURES = [
  { icon: 'cash-outline', text: `${formatMoney(STARTING_BALANCE)} wirtualnych środków na start` },
  { icon: 'swap-vertical', text: 'Graj na wzrost i na spadek kursu (krótka sprzedaż)' },
  { icon: 'pulse', text: 'Kursy zmieniają się na żywo, rynkiem poruszają wiadomości' },
  { icon: 'server-outline', text: 'Konta, portfel i historia w lokalnej bazie danych SQLite' },
];

const HERO_CODES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];

// Wspólny wygląd ekranów logowania i rejestracji.
// Na komputerze ekran jest podzielony: po lewej ciemny panel z kursami, po prawej formularz.
export default function AuthScaffold({ title, subtitle, children, footer, pageTitle }) {
  const { colors } = useAppTheme();
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
        <ScrollView
          style={styles.formSide}
          contentContainerStyle={styles.formSideContent}
          keyboardShouldPersistTaps="handled"
        >
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
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.topBar}>
              <View style={styles.brand}>
                <Logo size={38} />
                <Text style={[styles.brandName, { color: colors.text }]}>Giełda Walut</Text>
              </View>
              <ThemeToggle />
            </View>
            <LiveTicker codes={HERO_CODES} />
            {form}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// Lewy panel na komputerze (zawsze ciemny, jak terminal giełdowy): opis aplikacji i kursy na żywo.
function HeroPanel() {
  const { colors } = useAppTheme();
  const { quotes } = useMarket();
  const ink = { color: colors.panelText };
  const muted = { color: colors.panelMuted };

  return (
    <View style={[styles.hero, { backgroundColor: colors.panelBg, borderRightColor: colors.panelLine }]}>
      <ScrollView contentContainerStyle={styles.heroContent} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Logo size={40} />
          <Text style={[styles.brandName, ink]}>Giełda Walut</Text>
        </View>

        <Text style={[styles.kicker, { color: colors.primary }]}>SYMULATOR RYNKU WALUT · PLN</Text>
        <Text style={[styles.heroTitle, ink]}>
          Kupuj tanio, sprzedawaj drogo.{'\n'}
          <Text style={{ color: colors.primary }}>Albo odwrotnie.</Text>
        </Text>
        <Text style={[styles.heroText, muted]}>
          Handluj dolarem, euro czy frankiem na rynku, który zmienia się co sekundę. Obserwuj wykresy, reaguj na
          wiadomości i sprawdź, czy pokonasz rynek bez ryzyka utraty prawdziwych pieniędzy.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.icon} style={styles.feature}>
              <Ionicons name={f.icon} size={18} color={colors.primary} />
              <Text style={[styles.featureText, ink]}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.ratesCard, { borderColor: colors.panelLine }]}>
          <View style={[styles.ratesHeader, { borderBottomColor: colors.panelLine }]}>
            <Text style={[styles.ratesTitle, muted]}>KURSY NA ŻYWO</Text>
            <Text style={[styles.ratesTitle, muted]}>ZMIANA</Text>
          </View>
          {HERO_CODES.map((code) => {
            const quote = quotes[code];
            const change = getChangePercent(quote);
            const trend = change >= 0 ? darkColors.up : darkColors.down;
            return (
              <View key={code} style={styles.rateRow}>
                <CurrencyAvatar code={code} size={28} />
                <Text style={[styles.rateCode, ink]}>{code}/PLN</Text>
                <Sparkline data={quote.history.slice(-50)} color={trend} width={110} height={26} />
                <Text style={[styles.rateValue, ink]}>{formatRate(quote.mid)}</Text>
                <Text style={[styles.rateChange, { color: trend }]}>{formatPercent(change)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 40, width: '100%', maxWidth: 480, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { fontSize: 19, fontFamily: fonts.bold, letterSpacing: -0.3 },
  heading: { marginTop: 28, marginBottom: 18 },
  title: { fontSize: 32, fontFamily: fonts.bold, letterSpacing: -0.8 },
  subtitle: { fontSize: 15.5, fontFamily: fonts.regular, lineHeight: 22, marginTop: 6 },
  card: { padding: 20 },
  footer: { marginTop: 20, alignItems: 'center' },

  // Układ na komputer
  split: { flex: 1, flexDirection: 'row' },
  hero: { flex: 1.1, borderRightWidth: StyleSheet.hairlineWidth },
  heroContent: { flexGrow: 1, justifyContent: 'center', padding: 56, maxWidth: 680 },
  kicker: { fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.6, marginTop: 48 },
  heroTitle: { fontSize: 42, lineHeight: 50, fontFamily: fonts.bold, letterSpacing: -1.2, marginTop: 14 },
  heroText: { fontSize: 16, fontFamily: fonts.regular, lineHeight: 25, marginTop: 16, maxWidth: 520 },
  features: { gap: 12, marginTop: 30 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15, fontFamily: fonts.medium, flex: 1 },
  ratesCard: { marginTop: 36, borderRadius: 10, borderWidth: 1, maxWidth: 540, overflow: 'hidden' },
  ratesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ratesTitle: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1.2 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 9 },
  rateCode: { fontSize: 14, fontFamily: fonts.monoBold, flex: 1 },
  rateValue: { fontSize: 14.5, fontFamily: fonts.monoMedium, width: 76, textAlign: 'right' },
  rateChange: { fontSize: 13, fontFamily: fonts.monoMedium, width: 70, textAlign: 'right' },
  formSide: { flex: 1 },
  formSideContent: { flexGrow: 1, padding: 32 },
  formTopBar: { flexDirection: 'row', justifyContent: 'flex-end' },
  formBox: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingVertical: 24,
  },
});

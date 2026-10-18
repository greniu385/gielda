import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../../components/AppButton';
import Card from '../../../components/Card';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Screen from '../../../components/Screen';
import ScreenHeader from '../../../components/ScreenHeader';
import SegmentedControl from '../../../components/SegmentedControl';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { useMarket } from '../../../context/MarketContext';
import { usePortfolio } from '../../../context/PortfolioContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { STARTING_BALANCE } from '../../../logic/trading';
import { getErrorMessage, logoutUser } from '../../../services/authService';
import { SPEEDS, VOLATILITY_MODES } from '../../../simulation/marketEngine';
import { useAppTheme } from '../../../theme/ThemeContext';
import { formatDate, formatMoney } from '../../../utils/format';

const SPEED_OPTIONS = Object.entries(SPEEDS).map(([value, { label }]) => ({ value, label }));
const VOLATILITY_OPTIONS = Object.entries(VOLATILITY_MODES).map(([value, { label }]) => ({ value, label }));

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { user } = useAuth();
  const { settings, updateSettings, resetMarket } = useMarket();
  const { portfolio, reset } = usePortfolio();
  const { showToast } = useToast();
  const { isDesktop } = useResponsive();

  const [dialog, setDialog] = useState(null); // 'reset' | 'logout' | null
  const [busy, setBusy] = useState(false);

  const name = portfolio?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Inwestor';
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const createdAt = portfolio?.createdAt?.toDate?.();

  async function handleConfirm() {
    setBusy(true);
    try {
      if (dialog === 'reset') {
        await reset();
        showToast(`Portfel zresetowany — masz znowu ${formatMoney(STARTING_BALANCE)}`);
        setDialog(null);
      } else {
        setDialog(null);
        await logoutUser();
      }
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  }

  const userSection = (
    <>
      <Card style={styles.userCard}>
        <LinearGradient colors={colors.gradient} style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </LinearGradient>
        <View style={styles.userInfo}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>
            {user?.email}
          </Text>
          {createdAt ? (
            <Text style={[styles.since, { color: colors.textSubtle }]}>Konto od {formatDate(createdAt)}</Text>
          ) : null}
        </View>
      </Card>
    </>
  );

  const appearanceSection = (
    <>
      <SectionTitle icon="color-palette-outline" title="Wygląd" />
      <Card>
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Tryb nocny</Text>
            <Text style={[styles.settingSub, { color: colors.textMuted }]}>
              {isDark ? 'Włączony — ciemny motyw' : 'Wyłączony — jasny motyw'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Tryb nocny"
          />
        </View>
      </Card>
    </>
  );

  const simulationSection = (
    <>
      <SectionTitle icon="pulse" title="Symulacja rynku" first={isDesktop} />
      <Card>
        <Text style={[styles.label, { color: colors.textMuted }]}>Prędkość notowań</Text>
        <SegmentedControl
          options={SPEED_OPTIONS}
          value={settings.speed}
          onChange={(speed) => updateSettings({ speed })}
        />

        <Text style={[styles.label, styles.labelSpaced, { color: colors.textMuted }]}>Zmienność rynku</Text>
        <SegmentedControl
          options={VOLATILITY_OPTIONS}
          value={settings.volatility}
          onChange={(volatility) => updateSettings({ volatility })}
        />
        <Text style={[styles.hint, { color: colors.textSubtle }]}>
          Większa zmienność oznacza większe wahania kursów i częstsze wiadomości rynkowe.
        </Text>

        <View style={[styles.settingRow, styles.labelSpaced]}>
          <View style={[styles.settingIcon, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name={settings.paused ? 'play' : 'pause'} size={18} color={colors.warning} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>Wstrzymaj notowania</Text>
            <Text style={[styles.settingSub, { color: colors.textMuted }]}>Kursy przestaną się zmieniać</Text>
          </View>
          <Switch
            value={settings.paused}
            onValueChange={(paused) => updateSettings({ paused })}
            trackColor={{ false: colors.border, true: colors.warning }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Wstrzymaj notowania"
          />
        </View>

        <AppButton
          title="Nowa sesja giełdowa"
          icon="refresh"
          variant="secondary"
          small
          style={styles.labelSpaced}
          onPress={() => {
            resetMarket();
            showToast('Rozpoczęto nową sesję — kursy wróciły do wartości bazowych', 'info');
          }}
        />
      </Card>
    </>
  );

  const accountSection = (
    <>
      <SectionTitle icon="person-outline" title="Konto" />
      <Card style={styles.accountCard}>
        <AppButton
          title="Zresetuj portfel"
          icon="refresh-circle-outline"
          variant="dangerSoft"
          onPress={() => setDialog('reset')}
        />
        <AppButton title="Wyloguj się" icon="log-out-outline" variant="secondary" onPress={() => setDialog('logout')} />
      </Card>
    </>
  );

  return (
    <Screen scroll>
      <ScreenHeader title="Profil" subtitle="Konto i ustawienia" />
      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.column}>
            {userSection}
            {appearanceSection}
            {accountSection}
          </View>
          <View style={styles.column}>{simulationSection}</View>
        </View>
      ) : (
        <>
          {userSection}
          {appearanceSection}
          {simulationSection}
          {accountSection}
        </>
      )}

      <Text style={[styles.footer, { color: colors.textSubtle }]}>
        Giełda Walut 1.0 · symulacja edukacyjna — wszystkie środki są wirtualne
      </Text>

      <ConfirmDialog
        visible={dialog === 'reset'}
        title="Zresetować portfel?"
        message={`Wszystkie waluty i historia transakcji zostaną usunięte, a saldo wróci do ${formatMoney(STARTING_BALANCE)}.`}
        confirmLabel="Resetuj"
        destructive
        loading={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'logout'}
        title="Wylogować się?"
        message="Twój portfel zostanie zapisany w chmurze — po ponownym zalogowaniu wszystko będzie na swoim miejscu."
        icon="log-out-outline"
        confirmLabel="Wyloguj"
        loading={busy}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />
    </Screen>
  );
}

function SectionTitle({ icon, title, first = false }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.sectionTitle, first && styles.sectionTitleFirst]}>
      <Ionicons name={icon} size={17} color={colors.textMuted} />
      <Text style={[styles.sectionText, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  column: { flex: 1, minWidth: 0 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontSize: 23, fontWeight: '800' },
  userInfo: { flex: 1, minWidth: 0 },
  name: { fontSize: 20, fontWeight: '800' },
  email: { fontSize: 14, marginTop: 2 },
  since: { fontSize: 12, marginTop: 4 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, marginBottom: 10, marginLeft: 4 },
  sectionTitleFirst: { marginTop: 0 },
  sectionText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '700' },
  settingSub: { fontSize: 12.5, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  labelSpaced: { marginTop: 18 },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  accountCard: { gap: 10 },
  footer: { fontSize: 12, textAlign: 'center', marginTop: 24 },
});

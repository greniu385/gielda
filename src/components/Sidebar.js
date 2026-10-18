import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { usePortfolio } from '../context/PortfolioContext';
import { STARTING_BALANCE, getPortfolioValue } from '../logic/trading';
import { useAppTheme } from '../theme/ThemeContext';
import { formatMoney, formatPercent } from '../utils/format';
import ConfirmDialog from './ConfirmDialog';
import LiveDot from './LiveDot';
import Logo from './Logo';
import { fonts } from '../theme/fonts';

export const NAV_ITEMS = [
  { href: '/', title: 'Rynek', icon: 'stats-chart' },
  { href: '/wallet', title: 'Portfel', icon: 'wallet' },
  { href: '/history', title: 'Historia', icon: 'receipt' },
  { href: '/profile', title: 'Profil', icon: 'person-circle' },
];

function isActive(pathname, href) {
  if (href === '/') return pathname === '/' || pathname.startsWith('/currency');
  return pathname.startsWith(href);
}

// Boczne menu widoczne na szerokim ekranie (komputer).
export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useAppTheme();
  const { user, logout } = useAuth();
  const { portfolio } = usePortfolio();
  const { quotes, settings } = useMarket();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const value = getPortfolioValue(portfolio, quotes);
  const start = portfolio?.startingBalance ?? STARTING_BALANCE;
  const change = ((value - start) / start) * 100;
  const name = user?.displayName || 'Inwestor';

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      <View style={styles.brand}>
        <Logo size={40} />
        <View>
          <Text style={[styles.brandName, { color: colors.text }]}>Giełda Walut</Text>
          <Text style={[styles.brandSub, { color: colors.textMuted }]}>Symulator rynku</Text>
        </View>
      </View>

      <View style={styles.nav} accessibilityRole="tablist">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Pressable
              key={item.href}
              onPress={() => router.navigate(item.href)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ hovered }) => [
                styles.navItem,
                {
                  backgroundColor: active || hovered ? colors.surfaceAlt : 'transparent',
                  borderLeftColor: active ? colors.primary : 'transparent',
                },
              ]}
            >
              <Ionicons
                name={active ? item.icon : `${item.icon}-outline`}
                size={20}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.navLabel, { color: active ? colors.text : colors.textMuted }]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <View style={[styles.valueCard, { backgroundColor: colors.heroBg }]}>
        <Text style={[styles.valueLabel, { color: colors.heroMuted }]}>WARTOŚĆ PORTFELA</Text>
        <Text style={[styles.value, { color: colors.heroText }]} numberOfLines={1}>
          {formatMoney(value)}
        </Text>
        <Text style={[styles.valueChange, { color: colors.heroText }]}>{formatPercent(change)} od startu</Text>
      </View>

      <View style={[styles.status, { borderColor: colors.border }]}>
        <LiveDot color={settings.paused ? colors.warning : colors.up} active={!settings.paused} size={7} />
        <Text style={[styles.statusText, { color: colors.textMuted }]}>
          {settings.paused ? 'Notowania wstrzymane' : 'Notowania na żywo'}
        </Text>
      </View>

      <View style={[styles.user, { borderTopColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
        <Pressable
          onPress={() => setConfirmLogout(true)}
          accessibilityRole="button"
          accessibilityLabel="Wyloguj się"
          style={({ hovered }) => [styles.logout, { backgroundColor: hovered ? colors.downSoft : 'transparent' }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.down} />
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmLogout}
        title="Wylogować się?"
        message="Twój portfel jest zapisany w bazie danych — po ponownym zalogowaniu wszystko będzie na swoim miejscu."
        icon="log-out-outline"
        confirmLabel="Wyloguj"
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 264, borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginBottom: 32 },
  brandName: { fontSize: 18, fontFamily: fonts.bold, letterSpacing: -0.3 },
  brandSub: { fontSize: 12.5, fontFamily: fonts.regular, marginTop: 1 },
  nav: { gap: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  navLabel: { fontSize: 15, fontFamily: fonts.bold },
  spacer: { flex: 1 },
  valueCard: { borderRadius: 8, padding: 16 },
  valueLabel: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1.1 },
  value: { fontSize: 20, fontFamily: fonts.monoBold, marginTop: 6 },
  valueChange: { fontSize: 12.5, fontFamily: fonts.monoMedium, marginTop: 4 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: { fontSize: 12.5, fontFamily: fonts.semibold },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarText: { fontSize: 16, fontFamily: fonts.bold },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 14, fontFamily: fonts.bold },
  userEmail: { fontSize: 12, fontFamily: fonts.regular, marginTop: 1 },
  logout: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

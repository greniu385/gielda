import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { MarketProvider } from '../context/MarketContext';
import { ToastProvider } from '../components/Toast';
import { AppThemeProvider, useAppTheme } from '../theme/ThemeContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <MarketProvider>
            <ToastProvider>
              <RootNavigator />
            </ToastProvider>
          </MarketProvider>
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isDark, colors } = useAppTheme();
  const { user, status } = useAuth();

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.down,
      },
    };
  }, [isDark, colors]);

  const offline = status === 'offline';

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Stack.Protected pilnuje dostępu: zalogowany użytkownik widzi aplikację,
          a niezalogowany — tylko ekrany logowania i rejestracji. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!offline && Boolean(user)} redirectTo={offline ? '/offline' : '/login'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!offline && !user} redirectTo={offline ? '/offline' : '/'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={offline} redirectTo="/">
          <Stack.Screen name="offline" />
        </Stack.Protected>
      </Stack>
      {status === 'loading' ? <SplashOverlay /> : null}
    </ThemeProvider>
  );
}

// Ekran ładowania wyświetlany, dopóki nie sprawdzimy połączenia z serwerem i sesji użytkownika.
function SplashOverlay() {
  const { colors } = useAppTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.splash, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.gradient} style={styles.logo}>
        <Ionicons name="trending-up" size={40} color="#FFFFFF" />
      </LinearGradient>
      <Text style={[styles.title, { color: colors.text }]}>Giełda Walut</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginTop: 18 },
});

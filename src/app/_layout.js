import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { MarketProvider } from '../context/MarketContext';
import Logo from '../components/Logo';
import { ToastProvider } from '../components/Toast';
import { FONT_FILES, fonts } from '../theme/fonts';
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
  // Czcionki są w projekcie (assets z @expo-google-fonts) — ładowanie trwa ułamek sekundy.
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const fontsReady = fontsLoaded || Boolean(fontError);

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
      {status === 'loading' || !fontsReady ? <SplashOverlay /> : null}
    </ThemeProvider>
  );
}

// Ekran ładowania wyświetlany, dopóki nie sprawdzimy połączenia z serwerem i sesji użytkownika.
function SplashOverlay() {
  const { colors } = useAppTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.splash, { backgroundColor: colors.background }]}>
      <Logo size={72} />
      <Text style={[styles.title, { color: colors.text }]}>Giełda Walut</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontFamily: fonts.bold, marginTop: 18 },
});

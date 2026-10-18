import { Stack } from 'expo-router';

import { PortfolioProvider } from '../../context/PortfolioContext';
import { useAppTheme } from '../../theme/ThemeContext';

export const unstable_settings = { anchor: '(tabs)' };

// Część aplikacji dostępna tylko po zalogowaniu.
export default function AppLayout() {
  const { colors } = useAppTheme();
  return (
    <PortfolioProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="currency/[code]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </PortfolioProvider>
  );
}

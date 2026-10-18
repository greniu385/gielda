import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';

import Sidebar from '../../components/Sidebar';
import { PortfolioProvider } from '../../context/PortfolioContext';
import { useResponsive } from '../../hooks/useResponsive';
import { useAppTheme } from '../../theme/ThemeContext';

export const unstable_settings = { anchor: '(tabs)' };

// Część aplikacji dostępna tylko po zalogowaniu.
// Na komputerze po lewej stronie jest stałe boczne menu, na telefonie — dolne zakładki.
export default function AppLayout() {
  const { colors } = useAppTheme();
  const { isWide } = useResponsive();

  return (
    <PortfolioProvider>
      <View style={[styles.row, { backgroundColor: colors.background }]}>
        {isWide ? <Sidebar /> : null}
        <View style={styles.main}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="currency/[code]" options={{ animation: isWide ? 'fade' : 'slide_from_right' }} />
          </Stack>
        </View>
      </View>
    </PortfolioProvider>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  main: { flex: 1 },
});

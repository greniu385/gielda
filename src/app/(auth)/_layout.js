import { Stack } from 'expo-router';

import { useAppTheme } from '../../theme/ThemeContext';

export const unstable_settings = { anchor: 'login' };

export default function AuthLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

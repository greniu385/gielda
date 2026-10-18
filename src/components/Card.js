import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

export default function Card({ children, style, padded = true }) {
  const { colors, isDark } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOpacity: isDark ? 0 : 0.06,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 0,
  },
  padded: { padding: 16 },
});

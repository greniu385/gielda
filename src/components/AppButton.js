import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';

// Przycisk w kilku wariantach: primary (gradient), secondary, success, danger, ghost.
export default function AppButton({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }) {
  const { colors } = useAppTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: null, fg: colors.onPrimary },
    secondary: { bg: colors.surfaceAlt, fg: colors.text, border: colors.border },
    success: { bg: colors.up, fg: '#FFFFFF' },
    danger: { bg: colors.down, fg: '#FFFFFF' },
    dangerSoft: { bg: colors.downSoft, fg: colors.down },
    ghost: { bg: 'transparent', fg: colors.primary },
  }[variant];

  const content = (
    <View style={[styles.inner, small && styles.innerSmall]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={palette.fg} /> : null}
          <Text style={[styles.label, small && styles.labelSmall, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        palette.bg !== null && { backgroundColor: palette.bg },
        palette.border && { borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
        { opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 16, overflow: 'hidden' },
  gradient: { borderRadius: 16 },
  inner: {
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  innerSmall: { minHeight: 40, paddingHorizontal: 14 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  labelSmall: { fontSize: 14 },
});

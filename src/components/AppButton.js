import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';

// Przycisk w kilku wariantach: primary (kolor akcentu), secondary, success, danger, ghost.
export default function AppButton({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }) {
  const { colors } = useAppTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.surfaceAlt, fg: colors.text, border: colors.border, hoverBg: colors.elevated },
    success: { bg: colors.up, fg: colors.onAccent },
    danger: { bg: colors.down, fg: colors.onAccent },
    short: { bg: colors.short, fg: colors.onAccent },
    dangerSoft: { bg: colors.downSoft, fg: colors.down },
    ghost: { bg: 'transparent', fg: colors.primary, hoverBg: colors.primarySoft },
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
      style={({ pressed, hovered }) => [
        styles.base,
        { backgroundColor: hovered && palette.hoverBg ? palette.hoverBg : palette.bg },
        palette.border && { borderWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
        {
          opacity: disabled ? 0.45 : pressed ? 0.85 : hovered && !palette.hoverBg ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 10, overflow: 'hidden' },
  inner: {
    minHeight: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  innerSmall: { minHeight: 40, paddingHorizontal: 14 },
  label: { fontSize: 16, fontFamily: fonts.bold, letterSpacing: 0.2 },
  labelSmall: { fontSize: 14 },
});

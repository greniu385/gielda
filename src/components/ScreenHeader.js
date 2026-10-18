import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useResponsive } from '../hooks/useResponsive';
import { useAppTheme } from '../theme/ThemeContext';
import PageTitle from './PageTitle';
import ThemeToggle from './ThemeToggle';
import { fonts } from '../theme/fonts';

export default function ScreenHeader({ title, subtitle, onBack, right, pageTitle }) {
  const { colors } = useAppTheme();
  const { isWide } = useResponsive();

  return (
    <View style={[styles.row, isWide && styles.rowWide]}>
      <PageTitle title={pageTitle ?? title} />
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
          style={({ hovered }) => [
            styles.back,
            { backgroundColor: hovered ? colors.elevated : colors.surfaceAlt, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        <Text style={[styles.title, isWide && styles.titleWide, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.right}>
        {right}
        <ThemeToggle showLabel={isWide} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 16, gap: 12 },
  rowWide: { paddingTop: 20, paddingBottom: 24 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  titles: { flex: 1 },
  subtitle: { fontSize: 13, fontFamily: fonts.medium, marginBottom: 2 },
  title: { fontSize: 28, fontFamily: fonts.bold, letterSpacing: -0.5 },
  titleWide: { fontSize: 32 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

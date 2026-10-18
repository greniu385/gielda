import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';

export default function EmptyState({ icon, title, message, children }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontFamily: fonts.bold, textAlign: 'center' },
  message: { fontSize: 14, fontFamily: fonts.regular, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
});

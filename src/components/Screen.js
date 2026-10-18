import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useResponsive } from '../hooks/useResponsive';
import { useAppTheme } from '../theme/ThemeContext';

// Wspólny kontener ekranu: tło zgodne z motywem, bezpieczne marginesy,
// a na szerokim ekranie treść wyśrodkowana z maksymalną szerokością.
export default function Screen({ children, scroll = false, edges = ['top'], contentStyle }) {
  const { colors } = useAppTheme();
  const { isWide } = useResponsive();
  const frame = [styles.frame, isWide && styles.frameWide];

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[frame, styles.scrollContent, isWide && styles.scrollContentWide, contentStyle]}
          showsVerticalScrollIndicator={isWide}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[frame, styles.content, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  frame: { width: '100%', alignSelf: 'center', paddingHorizontal: 16 },
  frameWide: { maxWidth: 1320, paddingHorizontal: 36 },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  scrollContentWide: { paddingTop: 16, paddingBottom: 48 },
});

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import Card from './Card';
import LiveTicker from './LiveTicker';
import ThemeToggle from './ThemeToggle';

// Wspólny wygląd ekranów logowania, rejestracji i resetu hasła.
export default function AuthScaffold({ title, subtitle, children, footer }) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#1A2150', colors.background] : ['#DCE3FF', colors.background]}
        style={styles.glow}
      />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.topBar}>
              <View style={styles.brand}>
                <LinearGradient colors={colors.gradient} style={styles.logo}>
                  <Ionicons name="trending-up" size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.brandName, { color: colors.text }]}>Giełda Walut</Text>
              </View>
              <ThemeToggle />
            </View>

            <LiveTicker codes={['USD', 'EUR', 'GBP', 'CHF', 'JPY']} />

            <View style={styles.heading}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
            </View>

            <Card style={styles.card}>{children}</Card>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 40, width: '100%', maxWidth: 480, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  heading: { marginTop: 28, marginBottom: 18 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15.5, lineHeight: 22, marginTop: 6 },
  card: { padding: 20 },
  footer: { marginTop: 20, alignItems: 'center' },
});

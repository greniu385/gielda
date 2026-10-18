import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import { useAppTheme } from '../theme/ThemeContext';

const STEPS = [
  'Wejdź na console.firebase.google.com i utwórz nowy projekt.',
  'W projekcie dodaj aplikację typu „Web” (ikona </>) i skopiuj obiekt firebaseConfig.',
  'Skopiuj plik .env.example jako .env i wklej do niego dane z firebaseConfig.',
  'W zakładce Authentication → Sign-in method włącz logowanie „E-mail/hasło”.',
  'Utwórz bazę Firestore Database i wklej reguły z pliku firestore.rules.',
  'Uruchom aplikację ponownie: npx expo start -c',
];

// Ekran wyświetlany, gdy w pliku .env brakuje danych projektu Firebase.
export default function SetupScreen() {
  const { colors } = useAppTheme();

  return (
    <Screen scroll>
      <ScreenHeader title="Konfiguracja" subtitle="Brak połączenia z Firebase" />
      <Card style={[styles.alert, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
        <Ionicons name="construct-outline" size={24} color={colors.warning} />
        <Text style={[styles.alertText, { color: colors.text }]}>
          Aplikacja potrzebuje projektu Firebase do logowania i zapisywania portfela. Wykonaj poniższe kroki (szczegóły
          w pliku README.md).
        </Text>
      </Card>
      {STEPS.map((step, i) => (
        <View key={step} style={[styles.step, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.number, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.numberText, { color: colors.primary }]}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  alertText: { flex: 1, fontSize: 14.5, lineHeight: 21 },
  step: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 15, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 14.5, lineHeight: 20 },
});

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../components/AppButton';
import Card from '../components/Card';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../services/api';
import { useAppTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';

const STEPS = [
  'Otwórz terminal w folderze projektu.',
  'Uruchom serwer z bazą danych: npm run server (albo npm start — serwer i strona razem).',
  'Poczekaj na komunikat „Serwer Giełdy Walut działa” i kliknij „Spróbuj ponownie”.',
];

// Ekran wyświetlany, gdy aplikacja nie może połączyć się z lokalnym serwerem.
export default function OfflineScreen() {
  const { colors } = useAppTheme();
  const { retry } = useAuth();

  return (
    <Screen scroll>
      <ScreenHeader title="Brak połączenia" subtitle="Serwer nie odpowiada" pageTitle="Brak połączenia z serwerem" />
      <View style={styles.box}>
        <Card style={[styles.alert, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
          <Ionicons name="server-outline" size={24} color={colors.warning} />
          <Text style={[styles.alertText, { color: colors.text }]}>
            Konta, portfele i historia transakcji są zapisane w lokalnej bazie danych, którą obsługuje serwer pod
            adresem <Text style={styles.mono}>{API_URL}</Text>. Wygląda na to, że serwer nie jest uruchomiony.
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
        <AppButton title="Spróbuj ponownie" icon="refresh" onPress={retry} style={styles.retry} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { maxWidth: 720 },
  alert: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
  alertText: { flex: 1, fontSize: 14.5, fontFamily: fonts.regular, lineHeight: 21 },
  mono: { fontFamily: fonts.monoBold },
  step: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 15, fontFamily: fonts.bold },
  stepText: { flex: 1, fontSize: 14.5, fontFamily: fonts.regular, lineHeight: 20 },
  retry: { marginTop: 8, alignSelf: 'flex-start' },
});

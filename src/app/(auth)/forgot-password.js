import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppButton from '../../components/AppButton';
import AuthScaffold from '../../components/AuthScaffold';
import TextField from '../../components/TextField';
import { getErrorMessage, resetPassword } from '../../services/authService';
import { useAppTheme } from '../../theme/ThemeContext';
import { validateEmail } from '../../utils/validation';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const validationError = validateEmail(email);
    setError(validationError);
    if (validationError) return;

    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      title="Reset hasła"
      subtitle="Podaj adres e-mail powiązany z kontem — wyślemy Ci link do ustawienia nowego hasła."
      footer={
        <Link href="/login" style={[styles.link, { color: colors.primary }]}>
          ← Wróć do logowania
        </Link>
      }
    >
      {sent ? (
        <View style={styles.sent}>
          <View style={[styles.sentIcon, { backgroundColor: colors.upSoft }]}>
            <Ionicons name="mail-open-outline" size={30} color={colors.up} />
          </View>
          <Text style={[styles.sentTitle, { color: colors.text }]}>Sprawdź skrzynkę</Text>
          <Text style={[styles.sentText, { color: colors.textMuted }]}>
            Jeśli konto {email.trim()} istnieje, wysłaliśmy na nie link do resetu hasła.
          </Text>
        </View>
      ) : (
        <>
          <TextField
            label="E-mail"
            icon="mail-outline"
            placeholder="jan.kowalski@email.pl"
            value={email}
            onChangeText={setEmail}
            error={error}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onSubmitEditing={handleReset}
          />
          <AppButton title="Wyślij link" icon="key-outline" onPress={handleReset} loading={loading} />
        </>
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 15, fontWeight: '700' },
  sent: { alignItems: 'center', paddingVertical: 8 },
  sentIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  sentTitle: { fontSize: 19, fontWeight: '800', marginTop: 14 },
  sentText: { fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 6 },
});

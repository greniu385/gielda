import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import AppButton from '../../components/AppButton';
import AuthScaffold from '../../components/AuthScaffold';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/authService';
import { useAppTheme } from '../../theme/ThemeContext';
import { validateEmail } from '../../utils/validation';
import { fonts } from '../../theme/fonts';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const nextErrors = {
      email: validateEmail(email),
      password: password ? null : 'Podaj hasło.',
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      await login({ email, password });
      // Po zalogowaniu nawigacja przełączy się automatycznie (Stack.Protected w _layout.js).
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      title="Witaj ponownie"
      pageTitle="Logowanie"
      subtitle="Zaloguj się, aby handlować walutami na symulowanym rynku."
      footer={
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Nie masz konta?{' '}
          <Link href="/register" style={[styles.link, { color: colors.primary }]}>
            Zarejestruj się
          </Link>
        </Text>
      }
    >
      <TextField
        label="E-mail"
        icon="mail-outline"
        placeholder="jan.kowalski@email.pl"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setErrors((e) => ({ ...e, email: null }));
        }}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Hasło"
        icon="lock-closed-outline"
        placeholder="••••••••"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setErrors((e) => ({ ...e, password: null }));
        }}
        error={errors.password}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={handleLogin}
        returnKeyType="go"
        style={styles.lastField}
      />

      {formError ? (
        <View style={[styles.formError, { backgroundColor: colors.downSoft }]}>
          <Text style={[styles.formErrorText, { color: colors.down }]}>{formError}</Text>
        </View>
      ) : null}

      <AppButton title="Zaloguj się" icon="log-in-outline" onPress={handleLogin} loading={loading} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  lastField: { marginBottom: 20 },
  formError: { borderRadius: 8, padding: 12, marginBottom: 14 },
  formErrorText: { fontSize: 14, fontFamily: fonts.semibold, textAlign: 'center' },
  footerText: { fontSize: 15, fontFamily: fonts.regular },
  link: { fontFamily: fonts.bold },
});

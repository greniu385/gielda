import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import AppButton from '../../components/AppButton';
import AuthScaffold from '../../components/AuthScaffold';
import TextField from '../../components/TextField';
import { getErrorMessage, registerUser } from '../../services/authService';
import { STARTING_BALANCE } from '../../logic/trading';
import { useAppTheme } from '../../theme/ThemeContext';
import { formatMoney } from '../../utils/format';
import {
  getPasswordStrength,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '../../utils/validation';

const STRENGTH_LABELS = ['Za krótkie', 'Słabe', 'Średnie', 'Silne', 'Bardzo silne'];

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: null }));
  };
  const strength = getPasswordStrength(form.password);
  const strengthColors = [colors.down, colors.down, colors.warning, colors.up, colors.up];

  async function handleRegister() {
    const nextErrors = {
      displayName: validateDisplayName(form.displayName),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: form.confirm === form.password ? null : 'Hasła nie są takie same.',
    };
    setErrors(nextErrors);
    setFormError(null);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await registerUser(form);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      title="Załóż konto"
      pageTitle="Rejestracja"
      subtitle={`Na start otrzymasz ${formatMoney(STARTING_BALANCE)} wirtualnych środków do inwestowania.`}
      footer={
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Masz już konto?{' '}
          <Link href="/login" style={[styles.link, { color: colors.primary }]}>
            Zaloguj się
          </Link>
        </Text>
      }
    >
      <TextField
        label="Imię lub nick"
        icon="person-outline"
        placeholder="Jan"
        value={form.displayName}
        onChangeText={update('displayName')}
        error={errors.displayName}
        autoComplete="name"
        maxLength={30}
      />
      <TextField
        label="E-mail"
        icon="mail-outline"
        placeholder="jan.kowalski@email.pl"
        value={form.email}
        onChangeText={update('email')}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Hasło"
        icon="lock-closed-outline"
        placeholder="Min. 6 znaków, w tym cyfra"
        value={form.password}
        onChangeText={update('password')}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        style={form.password ? styles.passwordWithMeter : undefined}
      />
      {form.password ? (
        <View style={styles.meter}>
          <View style={styles.meterBars}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.meterBar, { backgroundColor: i < strength ? strengthColors[strength] : colors.border }]}
              />
            ))}
          </View>
          <Text style={[styles.meterLabel, { color: strengthColors[strength] }]}>{STRENGTH_LABELS[strength]}</Text>
        </View>
      ) : null}
      <TextField
        label="Powtórz hasło"
        icon="shield-checkmark-outline"
        placeholder="••••••••"
        value={form.confirm}
        onChangeText={update('confirm')}
        error={errors.confirm}
        secureTextEntry
        autoComplete="new-password"
        onSubmitEditing={handleRegister}
        returnKeyType="go"
      />

      {formError ? (
        <View style={[styles.formError, { backgroundColor: colors.downSoft }]}>
          <Text style={[styles.formErrorText, { color: colors.down }]}>{formError}</Text>
        </View>
      ) : null}

      <AppButton title="Utwórz konto" icon="person-add-outline" onPress={handleRegister} loading={loading} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  passwordWithMeter: { marginBottom: 8 },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingHorizontal: 4 },
  meterBars: { flex: 1, flexDirection: 'row', gap: 4 },
  meterBar: { flex: 1, height: 4, borderRadius: 2 },
  meterLabel: { fontSize: 12, fontWeight: '700', minWidth: 80, textAlign: 'right' },
  formError: { borderRadius: 12, padding: 12, marginBottom: 14 },
  formErrorText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  footerText: { fontSize: 15 },
  link: { fontWeight: '700' },
});

import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { changePassword, getErrorMessage } from '../services/authService';
import { useAppTheme } from '../theme/ThemeContext';
import { validatePassword } from '../utils/validation';
import AppButton from './AppButton';
import Card from './Card';
import TextField from './TextField';
import { useToast } from './Toast';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

// Formularz zmiany hasła (hasło jest sprawdzane i zapisywane przez serwer).
export default function ChangePasswordCard() {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: null }));
  };

  async function handleSubmit() {
    const nextErrors = {
      currentPassword: form.currentPassword ? null : 'Podaj obecne hasło.',
      newPassword: validatePassword(form.newPassword),
      confirm: form.confirm === form.newPassword ? null : 'Hasła nie są takie same.',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setLoading(true);
    try {
      await changePassword(form);
      setForm(EMPTY);
      showToast('Hasło zostało zmienione');
    } catch (error) {
      setErrors({ currentPassword: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Hasło jest zapisane w bazie wyłącznie jako hash (scrypt z solą) — nie da się go odczytać z bazy.
      </Text>
      <TextField
        label="Obecne hasło"
        icon="lock-closed-outline"
        value={form.currentPassword}
        onChangeText={update('currentPassword')}
        error={errors.currentPassword}
        secureTextEntry
        autoComplete="current-password"
      />
      <TextField
        label="Nowe hasło"
        icon="key-outline"
        placeholder="Min. 6 znaków, w tym cyfra"
        value={form.newPassword}
        onChangeText={update('newPassword')}
        error={errors.newPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <TextField
        label="Powtórz nowe hasło"
        icon="shield-checkmark-outline"
        value={form.confirm}
        onChangeText={update('confirm')}
        error={errors.confirm}
        secureTextEntry
        autoComplete="new-password"
        onSubmitEditing={handleSubmit}
      />
      <AppButton
        title="Zmień hasło"
        icon="checkmark-circle"
        variant="secondary"
        onPress={handleSubmit}
        loading={loading}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12.5, lineHeight: 18, marginBottom: 14 },
});

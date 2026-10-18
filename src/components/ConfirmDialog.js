import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import AppButton from './AppButton';

// Okno potwierdzenia — działa tak samo na telefonie i w przeglądarce
// (wbudowany Alert z przyciskami nie działa w wersji web).
export default function ConfirmDialog({
  visible,
  title,
  message,
  icon = 'alert-circle',
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const { colors } = useAppTheme();
  const accent = destructive ? colors.down : colors.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={loading ? undefined : onCancel}>
        <Pressable style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: destructive ? colors.downSoft : colors.primarySoft }]}>
            <Ionicons name={icon} size={28} color={accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}
          <View style={styles.actions}>
            <AppButton title={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} style={styles.action} />
            <AppButton
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  action: { flex: 1 },
});

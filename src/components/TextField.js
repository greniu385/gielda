import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';

export default function TextField({ label, icon, error, secureTextEntry, style, ...inputProps }) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.down : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <View style={[styles.field, { backgroundColor: colors.surfaceAlt, borderColor }]}>
        {icon ? <Ionicons name={icon} size={19} color={focused ? colors.primary : colors.textMuted} /> : null}
        <TextInput
          {...inputProps}
          secureTextEntry={secureTextEntry && hidden}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Pokaż hasło' : 'Ukryj hasło'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.down }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  error: { fontSize: 12, marginTop: 5, marginLeft: 4 },
});

import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';
import { getCurrency } from '../simulation/currencies';

export default function CurrencyAvatar({ code, size = 44 }) {
  const { colors } = useAppTheme();
  const currency = getCurrency(code);
  const flag = code === 'PLN' ? '🇵🇱' : currency?.flag;

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{flag ?? code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});

import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import CA from 'country-flag-icons/string/1x1/CA';
import CH from 'country-flag-icons/string/1x1/CH';
import CZ from 'country-flag-icons/string/1x1/CZ';
import EU from 'country-flag-icons/string/1x1/EU';
import GB from 'country-flag-icons/string/1x1/GB';
import JP from 'country-flag-icons/string/1x1/JP';
import NO from 'country-flag-icons/string/1x1/NO';
import PL from 'country-flag-icons/string/1x1/PL';
import US from 'country-flag-icons/string/1x1/US';

import { useAppTheme } from '../theme/ThemeContext';

// Flaga kraju (lub Unii Europejskiej) dla każdej waluty.
const FLAGS = { USD: US, EUR: EU, GBP: GB, CHF: CH, JPY: JP, CAD: CA, NOK: NO, CZK: CZ, PLN: PL };

export default function CurrencyAvatar({ code, size = 44 }) {
  const { colors } = useAppTheme();
  const flag = FLAGS[code];

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
        },
      ]}
    >
      {flag ? <SvgXml xml={flag} width={size} height={size} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});

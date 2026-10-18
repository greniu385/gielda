import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useAppTheme } from '../theme/ThemeContext';

// Znak aplikacji: trzy świece z wykresu świecowego na kwadracie w kolorze akcentu.
// `inverted` — wersja na ciemny panel (jasne świece na tle akcentu jest zawsze czytelne).
export default function Logo({ size = 40 }) {
  const { colors } = useAppTheme();
  const ink = colors.onPrimary;

  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: colors.primary }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* knoty */}
        <Rect x="11.25" y="12" width="1.5" height="17" fill={ink} />
        <Rect x="19.25" y="7" width="1.5" height="22" fill={ink} />
        <Rect x="27.25" y="10" width="1.5" height="21" fill={ink} />
        {/* korpusy świec */}
        <Rect x="8.5" y="17" width="7" height="8" rx="1" fill={ink} />
        <Rect x="16.5" y="11" width="7" height="12" rx="1" fill={ink} />
        <Rect x="24.5" y="14" width="7" height="13" rx="1" fill={ink} opacity={0.55} />
      </Svg>
    </View>
  );
}

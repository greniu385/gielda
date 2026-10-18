import { View } from 'react-native';

import LineChart from './LineChart';

// Miniaturowy wykres do listy walut.
export default function Sparkline({ data, color, width = 72, height = 34 }) {
  return (
    <View style={{ width }}>
      <LineChart data={data} color={color} height={height} showLabels={false} strokeWidth={1.8} />
    </View>
  );
}

import { useId, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { useAppTheme } from '../theme/ThemeContext';
import { formatRate } from '../utils/format';

// Buduje ścieżkę SVG z listy punktów.
function buildPath(data, width, height, padding, rightPadding) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? (width - rightPadding) / (data.length - 1) : 0;

  const points = data.map((value, i) => [
    i * stepX,
    padding + (1 - (value - min) / range) * (height - padding * 2),
  ]);
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const lastX = points[points.length - 1][0];
  const area = `${line} L${lastX},${height} L0,${height} Z`;
  return { line, area, last: points[points.length - 1], min, max };
}

// Wykres liniowy kursu. Szerokość dopasowuje się do kontenera.
export default function LineChart({ data, height = 200, color, showLabels = true, strokeWidth = 2.5 }) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(0);
  const gradientId = `grad-${useId().replace(/:/g, '')}`;
  const stroke = color ?? colors.primary;

  const ready = width > 0 && data.length > 1;
  const chart = ready ? buildPath(data, width, height, showLabels ? 18 : 3, showLabels ? 10 : 0) : null;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {chart ? (
        <>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stroke} stopOpacity={0.35} />
                <Stop offset="1" stopColor={stroke} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {showLabels
              ? [0.25, 0.5, 0.75].map((f) => (
                  <Line
                    key={f}
                    x1={0}
                    x2={width}
                    y1={height * f}
                    y2={height * f}
                    stroke={colors.border}
                    strokeDasharray="4 6"
                    strokeWidth={1}
                  />
                ))
              : null}
            <Path d={chart.area} fill={`url(#${gradientId})`} />
            <Path d={chart.line} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
            {showLabels ? (
              <>
                <Circle cx={chart.last[0]} cy={chart.last[1]} r={9} fill={stroke} opacity={0.2} />
                <Circle cx={chart.last[0]} cy={chart.last[1]} r={4.5} fill={stroke} />
              </>
            ) : null}
          </Svg>
          {showLabels ? (
            <>
              <Text style={[styles.label, styles.top, { color: colors.textMuted }]}>max {formatRate(chart.max)}</Text>
              <Text style={[styles.label, styles.bottom, { color: colors.textMuted }]}>min {formatRate(chart.min)}</Text>
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', left: 4, fontSize: 11, fontWeight: '600' },
  top: { top: 0 },
  bottom: { bottom: 0 },
});

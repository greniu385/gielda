import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { formatPercent, formatTime } from '../utils/format';

// Wiadomość rynkowa wygenerowana przez symulację wraz z jej wpływem na kursy.
export default function NewsItem({ news, compact = false }) {
  const { colors } = useAppTheme();
  const accent = news.sentiment === 'up' ? colors.up : news.sentiment === 'down' ? colors.down : colors.warning;
  const soft = news.sentiment === 'up' ? colors.upSoft : news.sentiment === 'down' ? colors.downSoft : colors.warningSoft;
  const impacts = Object.entries(news.impacts);

  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <Ionicons name="newspaper-outline" size={18} color={accent} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={compact ? 1 : 2}>
            {news.title}
          </Text>
          <Text style={[styles.time, { color: colors.textSubtle }]}>{formatTime(news.timestamp)}</Text>
        </View>
        {!compact ? <Text style={[styles.description, { color: colors.textMuted }]}>{news.description}</Text> : null}
        <View style={styles.impacts}>
          {(compact ? impacts.slice(0, 4) : impacts).map(([code, impact]) => (
            <Text
              key={code}
              style={[
                styles.impact,
                { color: impact >= 0 ? colors.up : colors.down, backgroundColor: impact >= 0 ? colors.upSoft : colors.downSoft },
              ]}
            >
              {code} {formatPercent(impact * 100)}
            </Text>
          ))}
          {compact && impacts.length > 4 ? (
            <Text style={[styles.more, { color: colors.textMuted }]}>+{impacts.length - 4}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  time: { fontSize: 11.5, fontVariant: ['tabular-nums'], marginTop: 2 },
  description: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  impacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  impact: { fontSize: 11.5, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  more: { fontSize: 11.5, fontWeight: '700' },
});

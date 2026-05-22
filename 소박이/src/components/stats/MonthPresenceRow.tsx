import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

interface DayCellData {
  total: number;
}

interface MonthPresenceRowProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  daysInMonth: number;
  expensesByDate: Record<string, DayCellData>;
  todayStr: string;
}

// Days where the numeric label renders above the glyph row.
// Sparse on purpose — the row reads as a soft trace, not a precise chart.
const LABEL_DAYS = [1, 10, 20, 30];

// Glyph table:
//   no record           → · (low-opacity middle dot)
//   no-spend only       → 🌿 (matches calendar leaf semantic)
//   any spending        → ●
//   today, no record    → ○ (only on current-month view)
//   mixed (spend + no-spend) → ● (spending dominates because total > 0)
function glyphFor(
  data: DayCellData | undefined,
  isToday: boolean,
  isFuture: boolean,
): { char: string; muted: boolean } {
  if (data) {
    if (data.total > 0) return { char: '●', muted: false };
    return { char: '🌿', muted: false };
  }
  if (isToday) return { char: '○', muted: false };
  return { char: '·', muted: isFuture };
}

export function MonthPresenceRow({
  viewYear,
  viewMonth,
  daysInMonth,
  expensesByDate,
  todayStr,
}: MonthPresenceRowProps) {
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        day,
        dateStr,
        data: expensesByDate[dateStr],
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      };
    });
  }, [viewYear, viewMonth, daysInMonth, expensesByDate, todayStr]);

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        {days.map(({ day }) => (
          <View key={day} style={styles.cell}>
            <Text style={styles.label}>
              {LABEL_DAYS.includes(day) ? String(day) : ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.glyphRow}>
        {days.map(({ day, data, isToday, isFuture }) => {
          const { char, muted } = glyphFor(data, isToday, isFuture);
          return (
            <View key={day} style={styles.cell}>
              <Text
                style={[
                  styles.glyph,
                  muted && styles.glyphMuted,
                ]}
              >
                {char}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  glyphRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    height: 14,
    lineHeight: 14,
  },
  glyph: {
    fontSize: 14,
    color: COLORS.textMuted,
    height: 18,
    lineHeight: 18,
    textAlign: 'center',
  },
  glyphMuted: {
    color: COLORS.textLight,
    opacity: 0.5,
  },
});

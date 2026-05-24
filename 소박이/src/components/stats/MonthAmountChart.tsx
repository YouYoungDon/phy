import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { COLORS } from '../../constants/colors';
import { barHeightFor, selectMaxTotal } from './monthAmountChart.helpers';

const BAR_MAX = 72;
const MIN_BAR = 8;
const Y_AXIS_W = 48;
// Sparse x-axis labels — chosen after on-device dogfooding (all-31 at 8px read
// too dense on small phones). Every bar still renders; only labels are thinned.
const LABEL_DAYS = new Set([1, 5, 10, 15, 20, 25, 30]);

interface MonthAmountChartProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  daysInMonth: number;
  expensesByDate: Record<string, { total: number }>;
  todayStr: string;
  selectedDay: string;
  onSelectDay: (dateStr: string) => void;
}

export function MonthAmountChart({
  viewYear,
  viewMonth,
  daysInMonth,
  expensesByDate,
  todayStr,
  selectedDay,
  onSelectDay,
}: MonthAmountChartProps) {
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        day,
        dateStr,
        total: expensesByDate[dateStr]?.total ?? 0,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDay,
        isFuture: dateStr > todayStr,
      };
    });
  }, [viewYear, viewMonth, daysInMonth, expensesByDate, todayStr, selectedDay]);

  const maxTotal = useMemo(
    () => selectMaxTotal(expensesByDate, viewYear, viewMonth, daysInMonth),
    [expensesByDate, viewYear, viewMonth, daysInMonth],
  );
  const midTotal = Math.round(maxTotal / 2);
  const hasAnySpending = maxTotal > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>이달의 흐름</Text>
      <View style={styles.wrapper}>
        <View style={styles.yAxis}>
          <Text style={styles.yLabel} numberOfLines={1}>{hasAnySpending ? maxTotal.toLocaleString() : ''}</Text>
          <Text style={styles.yLabel} numberOfLines={1}>{hasAnySpending ? midTotal.toLocaleString() : ''}</Text>
          <Text style={styles.yLabel} numberOfLines={1}>0</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.barArea}>
            <View style={[styles.guideLine, { top: 0 }]} />
            <View style={[styles.guideLine, { top: BAR_MAX / 2 }]} />
            <View style={[styles.guideLine, { bottom: 0 }]} />

            <View style={styles.barsRow}>
              {days.map(({ day, dateStr, total, isToday, isSelected, isFuture }) => {
                const h = barHeightFor(total, maxTotal, BAR_MAX, MIN_BAR);
                const hasData = h > 0;
                return (
                  <Pressable
                    key={day}
                    style={styles.barColumn}
                    onPress={isFuture ? undefined : () => onSelectDay(dateStr)}
                    disabled={isFuture}
                    hitSlop={4}
                  >
                    <View
                      style={[
                        styles.bar,
                        hasData ? { height: h } : styles.barEmptyTick,
                        hasData && styles.barFilled,
                        isToday && !isSelected && styles.barToday,
                        isSelected && styles.barSelected,
                        isFuture && styles.barFuture,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Sparse labels (1/5/10/15/20/25/30) per on-device readability. Every
              bar still renders; only the labels are thinned to breathe. */}
          <View style={styles.xRow}>
            {days.map(({ day }) => (
              <View key={day} style={styles.xCell}>
                <Text style={styles.xLabel} numberOfLines={1}>{LABEL_DAYS.has(day) ? String(day) : ''}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 14,
    marginTop: 16,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  wrapper: {
    flexDirection: 'row',
    gap: 4,
  },
  yAxis: {
    width: Y_AXIS_W,
    height: BAR_MAX,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  barArea: {
    height: BAR_MAX,
    position: 'relative',
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  barsRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barFilled: {
    backgroundColor: COLORS.oliveGreen,
    opacity: 0.55,
  },
  barEmptyTick: {
    height: 2,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  barToday: {
    opacity: 0.9,
    borderWidth: 1,
    borderColor: COLORS.oliveDark,
  },
  barSelected: {
    backgroundColor: COLORS.oliveDark,
    opacity: 1,
  },
  barFuture: {
    opacity: 0.25,
  },
  xRow: {
    flexDirection: 'row',
    marginTop: 3,
  },
  xCell: {
    flex: 1,
    alignItems: 'center',
  },
  xLabel: {
    fontSize: 8,
    color: COLORS.textLight,
    textAlign: 'center',
    height: 13,
    lineHeight: 13,
  },
});

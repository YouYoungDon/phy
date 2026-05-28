import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { formatKoreanMonthDay } from '../../utils/date';

interface TodaySurfaceProps {
  todayDate: Date;
  totalAmount: number;
  recordCount: number;
  // Records where kind !== 'income' AND category !== 'no_spend'. Same definition the
  // home + DailySummary already use — when 0, the amount line is hidden so income-only
  // / no-spend-only days never display "0원".
  spendingCount: number;
  onPress: () => void;
}

// A soft semi-transparent "today" overlay floating in the home's upper-right corner —
// mirrors the level card on the left (top: 48). No card, no border, no CTA: cream-tone
// text with a soft drop shadow so it survives all four time-of-day backgrounds
// (morning / afternoon / evening / latenight). Quiet about zero — when today has no
// records, only the date + the "오늘의 기록" label render; the amount line follows
// DailySummary's spendingCount > 0 rule so no ₩0 is ever displayed.
export function TodaySurface({
  todayDate,
  totalAmount,
  recordCount,
  spendingCount,
  onPress,
}: TodaySurfaceProps) {
  const showAmount = spendingCount > 0;
  const showCount = recordCount > 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.todaySurface, pressed && styles.todaySurfacePressed]}
      onPress={onPress}
    >
      <Text style={styles.todayDate}>{formatKoreanMonthDay(todayDate)}</Text>
      <Text style={styles.todayLabel}>오늘의 기록</Text>
      {showAmount && (
        <Text style={styles.todayAmount}>{totalAmount.toLocaleString()}원</Text>
      )}
      {showCount && (
        <Text style={styles.todayCount}>{recordCount}개의 기록</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  todaySurface: {
    position: 'absolute',
    top: 48,
    right: 16,
    alignItems: 'flex-end',
  },
  // Press feedback: brief opacity dip on the whole container. No color change, no scale,
  // no border highlight — discoverable, not button-like.
  todaySurfacePressed: {
    opacity: 0.6,
  },
  todayDate: {
    fontSize: 11,
    color: 'rgba(255,253,248,0.72)',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 1,
  },
  todayLabel: {
    fontSize: 13,
    color: 'rgba(255,253,248,0.85)',
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  todayAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,253,248,0.92)',
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 1,
  },
  todayCount: {
    fontSize: 11,
    color: 'rgba(255,253,248,0.72)',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

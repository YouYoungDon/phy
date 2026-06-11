import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatKoreanYearMonthDay } from '../../utils/date';

interface TodaySurfaceProps {
  todayDate: Date;
  // Sum of today's spending records (kind !== income, category !== no_spend).
  spendingTotal: number;
  // Sum of today's income records.
  incomeTotal: number;
  onPress: () => void;
}

// A soft semi-transparent "today" overlay floating in the home's upper-right corner —
// mirrors the level card on the left (top: 48). No card, no border: cream-tone text with
// a soft drop shadow so it survives all four time-of-day backgrounds.
//
// Shows today's money quietly, without net/balance framing. When today has no
// money movement (no records, or a no-spend-only day), it stays quiet with
// "오늘은 무지출이에요 🌿" instead.
export function TodaySurface({
  todayDate,
  spendingTotal,
  incomeTotal,
  onPress,
}: TodaySurfaceProps) {
  const hasMoney = spendingTotal > 0 || incomeTotal > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.todaySurface, pressed && styles.todaySurfacePressed]}
      onPress={onPress}
      // Extend the tap area without changing the visual layout.
      hitSlop={{ top: 8, right: 8, bottom: 12, left: 16 }}
    >
      <Text style={styles.todayDate} numberOfLines={1} ellipsizeMode="tail">
        {formatKoreanYearMonthDay(todayDate)}
      </Text>

      {!hasMoney ? (
        <Text style={styles.todayLabel} numberOfLines={1} ellipsizeMode="tail">
          오늘은 무지출이에요 🌿
        </Text>
      ) : (
        <View style={styles.ledger}>
          {incomeTotal > 0 && (
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>들어온 기록</Text>
              <Text style={styles.ledgerValue} numberOfLines={1}>{incomeTotal.toLocaleString()}원</Text>
            </View>
          )}
          {spendingTotal > 0 && (
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>쓴 기록</Text>
              <Text style={styles.ledgerValue} numberOfLines={1}>{spendingTotal.toLocaleString()}원</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const CREAM = 'rgba(255,253,248,0.92)';
const CREAM_SOFT = 'rgba(255,253,248,0.78)';
const SHADOW = 'rgba(0,0,0,0.30)';

const textShadow = {
  textShadowColor: SHADOW,
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
} as const;

const styles = StyleSheet.create({
  todaySurface: {
    position: 'absolute',
    top: 48,
    right: 16,
    alignItems: 'flex-end',
  },
  todaySurfacePressed: {
    opacity: 0.6,
  },
  todayDate: {
    fontSize: 11,
    color: 'rgba(255,253,248,0.72)',
    ...textShadow,
    textShadowColor: 'rgba(0,0,0,0.25)',
    marginBottom: 3,
  },
  todayLabel: {
    fontSize: 13,
    color: 'rgba(255,253,248,0.85)',
    ...textShadow,
    marginBottom: 2,
  },
  // Fixed width so the label/value columns line up under the right-aligned date.
  ledger: {
    width: 142,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  ledgerLabel: {
    fontSize: 12,
    color: CREAM_SOFT,
    ...textShadow,
  },
  ledgerValue: {
    fontSize: 13,
    color: CREAM,
    ...textShadow,
  },
});

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
// Shows today's money at a glance: 들어온 돈 (+), 쓴 돈 (−), a divider, then 합계 (net =
// income − spending, signed). When today has no money movement (no records, or a
// no-spend-only day), it stays quiet with "오늘은 무지출이에요 🌿" instead.
//
// NOTE: this surfaces a daily NET total on the home screen — a deliberate product
// decision (2026-06-04) to make the home a quick money glance, overriding the earlier
// "no net/balance outside Stats" + "TodaySurface shows no income amount" rules. Don't
// silently revert it.
export function TodaySurface({
  todayDate,
  spendingTotal,
  incomeTotal,
  onPress,
}: TodaySurfaceProps) {
  const hasMoney = spendingTotal > 0 || incomeTotal > 0;
  const net = incomeTotal - spendingTotal;

  // 0 renders as a bare "0" (no sign); non-zero carries its sign.
  const signed = (n: number, sign: '+' | '−'): string =>
    n === 0 ? '0' : `${sign}${n.toLocaleString()}`;
  const netStr =
    net === 0 ? '0' : net > 0 ? `+${net.toLocaleString()}` : `−${Math.abs(net).toLocaleString()}`;

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
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>들어온 돈</Text>
            <Text style={styles.ledgerValue} numberOfLines={1}>{signed(incomeTotal, '+')}</Text>
          </View>
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabel}>쓴 돈</Text>
            <Text style={styles.ledgerValue} numberOfLines={1}>{signed(spendingTotal, '−')}</Text>
          </View>
          <View style={styles.ledgerDivider} />
          <View style={styles.ledgerRow}>
            <Text style={styles.ledgerLabelStrong}>합계</Text>
            <Text style={styles.ledgerNet} numberOfLines={1}>{netStr}</Text>
          </View>
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
  ledgerLabelStrong: {
    fontSize: 12,
    fontWeight: '600',
    color: CREAM,
    ...textShadow,
  },
  ledgerValue: {
    fontSize: 13,
    color: CREAM,
    ...textShadow,
  },
  ledgerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,253,248,0.35)',
    marginVertical: 4,
  },
  ledgerNet: {
    fontSize: 14,
    fontWeight: '700',
    color: CREAM,
    ...textShadow,
  },
});

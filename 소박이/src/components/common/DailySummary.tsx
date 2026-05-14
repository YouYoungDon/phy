import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

interface DailySummaryProps {
  totalAmount: number;
  recordCount: number;
}

export function DailySummary({ totalAmount, recordCount }: DailySummaryProps) {
  if (recordCount === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>오늘 첫 기록을 남겨봐요 🌿</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>소소한 기록</Text>
        <Text style={styles.value}>{recordCount}건</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.label}>오늘 소비</Text>
        <Text style={styles.valueAmount}>{totalAmount.toLocaleString()}원</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  empty: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  value: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  valueAmount: {
    fontSize: 13,
    color: COLORS.oliveDark,
    fontWeight: '600',
  },
});

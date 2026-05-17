import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Expense } from '../../types';
import { COLORS } from '../../constants/colors';
import { getDayFeeling } from '../../services/dayFeelingService';
import { SobagiEmotionFace } from '../sobagi/SobagiEmotionFace';

const DOW = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'] as const;

interface Props {
  dateStr: string;   // 'YYYY-MM-DD'
  expenses: Expense[];
  totalAmount: number;
}

export function DayFeelingCard({ dateStr, expenses, totalAmount }: Props) {
  const feeling = getDayFeeling(expenses, dateStr);

  const dt = new Date(dateStr + 'T00:00:00');
  const dow = DOW[dt.getDay()] ?? '';
  const dateLabel = `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${dow}`;

  return (
    <View style={[styles.card, { backgroundColor: feeling.bgColor }]}>
      <Text style={styles.corner}>🌿</Text>

      <Text style={styles.dateLabel}>{dateLabel}</Text>

      <View style={styles.face}>
        <SobagiEmotionFace emotion={feeling.sobagiEmotion} size={56} />
      </View>

      <Text style={styles.mainLine}>{feeling.mainLine}</Text>

      {feeling.observations.length > 0 && (
        <View style={styles.obsWrap}>
          {feeling.observations.map((obs, i) => (
            <Text key={i} style={styles.obsLine}>{obs}</Text>
          ))}
        </View>
      )}

      {totalAmount > 0 && (
        <Text style={styles.amount}>{totalAmount.toLocaleString('ko-KR')}원</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.wood,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 200,
  },
  corner: {
    position: 'absolute',
    top: 14,
    right: 16,
    fontSize: 18,
    opacity: 0.55,
  },
  dateLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 0.2,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  face: {
    marginBottom: 16,
  },
  mainLine: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 10,
  },
  obsWrap: {
    gap: 4,
    alignItems: 'center',
  },
  obsLine: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  amount: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 10,
    color: COLORS.textLight,
  },
});

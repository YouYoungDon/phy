import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Expense, ExpenseCategory } from '../../types';
import { COLORS } from '../../constants/colors';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  cafe: '☕ 카페',
  food: '🍚 식비',
  transport: '🚌 교통',
  shopping: '🛍️ 쇼핑',
  other: '📦 기타',
};

const EMOTION_EMOJIS: Record<string, string> = {
  happy: '😊', excited: '✨', surprised: '😮', sleepy: '😴', 'soft-sad': '🌧️',
};

interface ExpenseCardProps {
  expense: Expense;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.category}>{CATEGORY_LABELS[expense.category]}</Text>
      <View style={styles.row}>
        <Text style={styles.amount}>{expense.amount.toLocaleString()}원</Text>
        <Text style={styles.emotionEmoji}>{EMOTION_EMOJIS[expense.sobagiEmotion]}</Text>
      </View>
      {expense.memo ? <Text style={styles.memo}>{expense.memo}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 12,
    padding: 14,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  category: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  emotionEmoji: { fontSize: 20 },
  memo: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
});

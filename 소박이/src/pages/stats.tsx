import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { SobagiCharacter } from '../components/sobagi/SobagiCharacter';
import { EmotionBubble } from '../components/sobagi/EmotionBubble';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { useEmotionStore } from '../store/emotionStore';
import { ExpenseCategory } from '../types';
import { COLORS } from '../constants/colors';
import { getLocalDateString } from '../utils/date';
import { BottomTabs } from '../components/common/BottomTabs';
import { SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS } from '../constants/assets';

export const Route = createRoute('/stats', {
  validateParams: (params) => params,
  component: StatsScreen,
});

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  cafe: '카페 ☕',
  food: '식비 🍚',
  transport: '교통 🚌',
  shopping: '쇼핑 🛍️',
  other: '기타 📦',
};

function StatsScreen() {
  const expenses = useExpenseStore((s) => s.expenses);
  const streak = useUserStore((s) => s.streak);
  const currentEmotion = useEmotionStore((s) => s.currentEmotion);

  const weekStr = getLocalDateString(new Date(Date.now() - 7 * 86400000));
  const weekExpenses = expenses.filter((e) => e.createdAt >= weekStr);
  const weekTotal = weekExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryCounts = weekExpenses.reduce<Partial<Record<ExpenseCategory, number>>>(
    (acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const topCategory = (Object.entries(categoryCounts) as [ExpenseCategory, number][]).sort(
    ([, a], [, b]) => b - a,
  )[0]?.[0];

  const statsComment =
    streak >= 3
      ? `${streak}일 연속으로 기록하고 있어요! 소박이가 기특하다고 했어요 ✨`
      : weekTotal === 0
        ? '이번 주 기록을 시작해봐요 🌿'
        : `이번 주 ${weekTotal.toLocaleString()}원을 기록했어요. 잘 하고 있어요 💚`;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>소소한 기록</Text>
        <Text style={styles.headerSub}>이번 주를 돌아봐요</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.sobagiRow}>
          <SobagiCharacter emotion={currentEmotion} size="small" imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />
          <View style={styles.bubbleWrap}>
            <EmotionBubble message={statsComment} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>이번 주 지출</Text>
          <Text style={styles.cardValue}>{weekTotal.toLocaleString()}원</Text>
        </View>

        {topCategory != null && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>가장 많은 카테고리</Text>
            <Text style={styles.cardValue}>{CATEGORY_LABELS[topCategory]}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>연속 기록</Text>
          <Text style={styles.cardValue}>{streak}일 🔥</Text>
        </View>
      </ScrollView>
      <BottomTabs activeRoute="/stats" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: COLORS.cream,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  container: { flex: 1 },
  content: { paddingTop: 8, paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  sobagiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 8,
  },
  bubbleWrap: { flex: 1 },
  card: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14,
    padding: 18,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  cardLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  cardValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
});

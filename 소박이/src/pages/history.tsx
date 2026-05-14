import React from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { ExpenseCard } from '../components/expense/ExpenseCard';
import { useExpenseStore } from '../store/expenseStore';
import { Expense } from '../types';
import { getLocalDateString } from '../utils/date';
import { COLORS } from '../constants/colors';
import { BottomTabs } from '../components/common/BottomTabs';

export const Route = createRoute('/history', {
  validateParams: (params) => params,
  component: HistoryScreen,
});

function formatDateHeader(dateStr: string): string {
  const parts = dateStr.split('-');
  const month = parts[1];
  const day = parts[2];
  return `${parseInt(month ?? '0', 10)}월 ${parseInt(day ?? '0', 10)}일`;
}

function HistoryScreen() {
  const expenses = useExpenseStore((s) => s.expenses);

  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, expense) => {
    const dateStr = getLocalDateString(new Date(expense.createdAt));
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr]?.push(expense);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ title: date, data }));

  if (sections.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>아직 기록이 없어요 🌿{'\n'}첫 기록을 남겨봐요</Text>
        </View>
        <BottomTabs />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SectionList
        style={styles.list}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{formatDateHeader(title)}</Text>
          </View>
        )}
        contentContainerStyle={styles.content}
      />
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  list: { flex: 1, backgroundColor: COLORS.cream },
  content: { paddingBottom: 40, paddingTop: 16 },
  dateHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  dateText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24 },
});

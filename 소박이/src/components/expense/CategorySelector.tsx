import React from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ExpenseCategory } from '../../types';
import { COLORS } from '../../constants/colors';

const CATEGORIES: { key: ExpenseCategory; label: string; emoji: string }[] = [
  { key: 'cafe', label: '카페', emoji: '☕' },
  { key: 'food', label: '식비', emoji: '🍚' },
  { key: 'transport', label: '교통', emoji: '🚌' },
  { key: 'shopping', label: '쇼핑', emoji: '🛍️' },
  { key: 'other', label: '기타', emoji: '📦' },
];

interface CategorySelectorProps {
  selected: ExpenseCategory;
  onSelect: (category: ExpenseCategory) => void;
}

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CATEGORIES.map((c) => (
        <Pressable
          key={c.key}
          style={[styles.chip, selected === c.key && styles.chipSelected]}
          onPress={() => onSelect(c.key)}
        >
          <Text style={styles.emoji}>{c.emoji}</Text>
          <Text style={[styles.label, selected === c.key && styles.labelSelected]}>
            {c.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: COLORS.oliveGreen,
    borderColor: COLORS.oliveDark,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  labelSelected: {
    color: '#fff',
  },
});

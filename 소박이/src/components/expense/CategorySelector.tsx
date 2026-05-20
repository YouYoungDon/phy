import React from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { ExpenseCategory } from '../../types';
import { PICKER_CATEGORIES } from '../../constants/categories';
import { COLORS } from '../../constants/colors';

interface CategorySelectorProps {
  selected: ExpenseCategory;
  onSelect: (category: ExpenseCategory) => void;
}

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <View style={styles.row}>
      {PICKER_CATEGORIES.map((c) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: COLORS.woodLight,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  labelSelected: {
    color: COLORS.text,
  },
});

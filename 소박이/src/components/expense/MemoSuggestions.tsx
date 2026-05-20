import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { ExpenseCategory } from '../../types';
import { CATEGORY_BY_TOKEN } from '../../constants/categories';
import { COLORS } from '../../constants/colors';

const MEMO_MAX_LENGTH = 60;

interface MemoSuggestionsProps {
  category: ExpenseCategory;
  memo: string;
  onAppend: (next: string) => void;
}

export function MemoSuggestions({ category, memo, onAppend }: MemoSuggestionsProps) {
  if (category === 'no_spend') return null;

  const meta = CATEGORY_BY_TOKEN[category];
  const suggestions = meta?.memoSuggestions ?? [];
  if (suggestions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {suggestions.map((s) => (
        <Pressable
          key={s}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          onPress={() => onAppend(appendMemoSuggestion(memo, s))}
        >
          <Text style={styles.label}>{s}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * Pure. Returns the next memo string after merging a suggestion.
 * - Empty / whitespace-only memo → returns the suggestion.
 * - Suggestion already present as a comma-separated token → returns the original memo (no-op).
 * - Final string > MEMO_MAX_LENGTH (60) → returns the original memo (no-op).
 * - Otherwise → trimmed memo + ', ' + suggestion.
 */
export function appendMemoSuggestion(memo: string, suggestion: string): string {
  const trimmed = memo.trim();
  if (trimmed === '') return suggestion;

  const tokens = trimmed.split(',').map((t) => t.trim());
  if (tokens.includes(suggestion)) return memo;

  const next = `${trimmed}, ${suggestion}`;
  if (next.length > MEMO_MAX_LENGTH) return memo;

  return next;
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
    marginTop: 10,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipPressed: {
    opacity: 0.55,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
});

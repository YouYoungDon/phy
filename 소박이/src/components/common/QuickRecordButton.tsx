import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

interface QuickRecordButtonProps {
  onPress: () => void;
}

export function QuickRecordButton({ onPress }: QuickRecordButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.label}>+ 기록하기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.oliveDark,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: COLORS.oliveDark,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

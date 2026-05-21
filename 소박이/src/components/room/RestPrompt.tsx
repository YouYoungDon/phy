import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RestAdStatus } from '../../hooks/useRestedAd';
import { COLORS } from '../../constants/colors';

interface RestPromptProps {
  adStatus: RestAdStatus;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestPrompt({ adStatus, onConfirm, onCancel }: RestPromptProps) {
  const adReady = adStatus === 'ready';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>소박이랑 잠깐 쉬어갈까요? 📺</Text>
      <Text style={styles.body}>
        조용한 채널을 잠깐 보면{'\n'}소박이가 한 숨 돌릴 거예요.
      </Text>
      {!adReady && (
        <Text style={styles.hint}>준비 중이에요 🌿</Text>
      )}
      <View style={styles.buttonRow}>
        <Pressable style={styles.btnSecondary} onPress={onCancel}>
          <Text style={styles.btnSecondaryLabel}>다음에</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, !adReady && styles.btnPrimaryDisabled]}
          onPress={onConfirm}
          disabled={!adReady}
        >
          <Text style={styles.btnPrimaryLabel}>쉬어가기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  btnSecondaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.oliveDark,
  },
  btnPrimaryDisabled: {
    opacity: 0.5,
  },
  btnPrimaryLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

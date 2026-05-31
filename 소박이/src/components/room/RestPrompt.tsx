import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RestAdStatus } from '../../hooks/useRestedAd';
import { COLORS } from '../../constants/colors';

export type RestPromptState = 'reward' | 'daily-limit-reached';

interface RestPromptProps {
  state: RestPromptState;
  adStatus: RestAdStatus;
  watchesToday: number;        // effectiveRestsToday at render time
  dailyCap: number;            // REST_DAILY_CAP — passed in for layout flexibility
  onConfirm: (suppressToday: boolean) => void;  // primary "광고 보고 리워드 받기"
  onCancel: (suppressToday: boolean) => void;   // secondary "괜찮아요"
  onDismiss: () => void;       // daily-limit-reached "닫기"
}

// Three-state rest popup. The home screen owns the state decision; this
// component just renders. Suppress-today preference is captured locally
// and only persists when the user explicitly resolves the popup (confirm
// or cancel) — closing the sheet without pressing a button is treated as
// "no decision".
export function RestPrompt(props: RestPromptProps) {
  if (props.state === 'daily-limit-reached') {
    return <DailyLimitReachedView onDismiss={props.onDismiss} />;
  }
  return <RewardView {...props} />;
}

function DailyLimitReachedView({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>오늘은 받을 수 있는 리워드를 모두 받았어요 🌿</Text>
      <Text style={styles.body}>내일 다시 찾아와 주세요.</Text>
      <View style={styles.buttonRow}>
        <Pressable style={styles.btnSecondary} onPress={onDismiss}>
          <Text style={styles.btnSecondaryLabel}>닫기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RewardView({
  adStatus,
  watchesToday,
  dailyCap,
  onConfirm,
  onCancel,
}: RestPromptProps) {
  const [suppressToday, setSuppressToday] = useState(false);
  const adReady = adStatus === 'ready';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>잠시 쉬어갈까요?</Text>
      <Text style={styles.body}>광고를 보고 리워드를 받을 수 있어요.</Text>

      <View style={styles.rewardSection}>
        <Text style={styles.rewardLabel}>리워드</Text>
        <Text style={styles.rewardValue}>조약돌 1개</Text>
      </View>

      <Text style={styles.progress}>
        오늘 본 횟수 {watchesToday}/{dailyCap}
      </Text>

      {!adReady && (
        <Text style={styles.hint}>준비 중이에요 🌿</Text>
      )}

      <View style={styles.buttonRow}>
        <Pressable
          style={styles.btnSecondary}
          onPress={() => onCancel(suppressToday)}
        >
          <Text style={styles.btnSecondaryLabel}>괜찮아요</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, !adReady && styles.btnPrimaryDisabled]}
          onPress={() => onConfirm(suppressToday)}
          disabled={!adReady}
        >
          <Text style={styles.btnPrimaryLabel}>광고 보고 리워드 받기</Text>
        </Pressable>
      </View>

      {/* Plain checkbox row — no fancy chrome, matches the existing low-key
          aesthetic. The glyph swap (☑ / ☐) is the only visual feedback. */}
      <Pressable
        style={styles.suppressRow}
        onPress={() => setSuppressToday((v) => !v)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.suppressGlyph}>{suppressToday ? '☑' : '☐'}</Text>
        <Text style={styles.suppressLabel}>오늘 하루 더 이상 보지 않기</Text>
      </Pressable>
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
  rewardSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  rewardLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  progress: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
  suppressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    marginTop: 2,
  },
  suppressGlyph: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  suppressLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

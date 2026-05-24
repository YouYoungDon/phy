import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { SobagiReaction } from '../components/sobagi/SobagiReaction';
import { PhotocardView, PhotocardRecord } from '../components/photocard/PhotocardView';
import { useEmotionStore } from '../store/emotionStore';
import { useExpenseStore } from '../store/expenseStore';
import { COLORS } from '../constants/colors';
import { SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS } from '../constants/assets';
import { SobagiEmotion } from '../types';
import { useUserStore } from '../store/userStore';
import { getDialogueTier } from '../services/dialogueService';
import { formatCategoryLabel } from '../constants/categories';
import { RecordKind } from '../types';

export const Route = createRoute('/reaction', {
  validateParams: (params) => params,
  component: SobagiReactionScreen,
});

const WEEKDAY_LABELS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function formatNumericDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function formatTimeLabel(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const isAm = h < 12;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${isAm ? '오전' : '오후'} ${h12}:${m}`;
}

function getReactionTitle(emotion: SobagiEmotion, tier: 1 | 2 | 3, kind: RecordKind = 'spending'): string {
  // Income titles run a separate tonal track. Distinct wording from
  // INCOME_REACTION_POOLS (which feeds the bubble) so title + bubble
  // complement rather than duplicate. Tier progression shortens as
  // familiarity grows, mirroring the spending titles' shape.
  if (kind === 'income') {
    if (tier === 1) return '오늘은 든든한 날이에요 🌿';
    if (tier === 2) return '들어온 날이네요 🍃';
    return '들어왔네요 🍃';
  }
  if (tier === 1) {
    switch (emotion) {
      case 'surprised': return '처음 들렀네요 ✨';
      case 'excited':   return '조용히 이어지고 있네요 🌿';
      case 'sleepy':    return '이 시간까지 기록했네요 🌙';
      case 'soft-sad':  return '오늘은 좀 특별한 날이었네요';
      case 'happy':     return '오늘도 다녀왔네요 🌿';
    }
  }
  if (tier === 2) {
    switch (emotion) {
      case 'surprised': return '또 처음인 날이네요 ✨';
      case 'excited':   return '이어지고 있네요 🌿';
      case 'sleepy':    return '이 시간에도 들렀네요 🌙';
      case 'soft-sad':  return '그런 날도 있어요';
      case 'happy':     return '또 왔네요 🍃';
    }
  }
  // tier 3
  switch (emotion) {
    case 'surprised': return '오늘 처음이네요 ✨';
    case 'excited':   return '여전히 이어지고 있어요 🌿';
    case 'sleepy':    return '이 시간에도 여기 있네요 🌙';
    case 'soft-sad':  return '그런 날도 기억해둘게요';
    case 'happy':     return '왔네요 🍃';
  }
}

function FloatingHeart({ emoji, delay, offset }: { emoji: string; delay: number; offset: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -56] });
  const opacity = anim.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });

  return (
    <Animated.Text
      style={[styles.heart, { opacity, transform: [{ translateY }], marginHorizontal: offset }]}
    >
      {emoji}
    </Animated.Text>
  );
}

function SobagiReactionScreen() {
  const navigation = useNavigation();
  const currentEmotion = useEmotionStore((s) => s.currentEmotion);
  const currentMessage = useEmotionStore((s) => s.currentMessage);
  const recordedDaysCount = useUserStore((s) => s.recordedDaysCount);
  const getTodayExpenses = useExpenseStore((s) => s.getTodayExpenses);
  const tier = getDialogueTier(recordedDaysCount);

  const [photocardBtnVisible, setPhotocardBtnVisible] = useState(false);
  const [showPhotocardModal, setShowPhotocardModal] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const photocardBtnAnim = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(1)).current;
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hintOpacity = photocardBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  // Computed once at mount — expenses are already loaded when reaction screen renders.
  const todayExpenses = getTodayExpenses();
  // Latest save's kind — drives the title's kind-aware branch. `getTodayExpenses`
  // preserves append order (see expenseStore), so the last item is the record
  // that just triggered this reaction screen. Default 'spending' if today is
  // empty (defensive — this screen normally renders after a save).
  const latestKind: RecordKind = todayExpenses[todayExpenses.length - 1]?.kind ?? 'spending';
  // Photocard entry is gated on the day having at least one *spending* record
  // (sub-spec B §5.2). Income-only and no-spend-only saves never expose the
  // photocard handoff. Auto-dismiss still runs; just no button.
  const todayHasSpending = todayExpenses.some(
    (e) => e.kind !== 'income' && e.category !== 'no_spend',
  );
  // Source for the photocard's records block. Excludes no_spend (which is a
  // calendar marker, not a memory line). Income is INCLUDED so PhotocardView's
  // groupByKind can render the 들어온 기록 section on mixed days.
  const photocardSourceRecords = todayExpenses.filter((e) => e.category !== 'no_spend');
  // `todayTotal` still computed for the deprecated `amount` prop on PhotocardView
  // (kept for backward compat; no longer drives layout).
  const todayTotal = photocardSourceRecords.reduce((sum, e) => sum + e.amount, 0);
  const now = new Date();
  const dateStr = formatNumericDate(now);
  const weekdayLabel = WEEKDAY_LABELS[now.getDay()];
  const timeLabel = formatTimeLabel(now);
  const photocardRecords: PhotocardRecord[] = photocardSourceRecords.map((e) => ({
    id: e.id,
    category: e.category,
    categoryLabel: formatCategoryLabel(e.category),
    amount: e.amount,
    memo: e.memo,
    kind: e.kind,
  }));

  const handleClose = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: '/' }] });
  }, [navigation]);

  const openPhotocard = useCallback(() => {
    revealAnim.setValue(1);
    setIsRevealing(true);
    setShowPhotocardModal(true);
    requestAnimationFrame(() => {
      Animated.timing(revealAnim, {
        toValue: 0,
        duration: 1800,
        useNativeDriver: true,
      }).start(() => setIsRevealing(false));
    });
  }, [revealAnim]);

  const closePhotocard = useCallback(() => {
    setShowPhotocardModal(false);
  }, []);

  useEffect(() => {
    // Auto-dismiss at 3500ms — always runs. Cancelled only when the
    // photocard button reveal supersedes it.
    autoTimerRef.current = setTimeout(handleClose, 3500);

    // Income-only or no-spend-only saves never expose the photocard handoff.
    // The auto-dismiss above carries the user back home on its own timer.
    if (!todayHasSpending) {
      return () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      };
    }

    // Show photocard button at 1000ms and cancel the auto-dismiss
    const btnTimer = setTimeout(() => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      setPhotocardBtnVisible(true);
      Animated.timing(photocardBtnAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1000);

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      clearTimeout(btnTimer);
    };
  }, [handleClose, todayHasSpending]);

  return (
    <Pressable style={styles.container} onPress={handleClose}>
      <Text style={styles.title}>{getReactionTitle(currentEmotion, tier, latestKind)}</Text>

      <View style={styles.heartsRow}>
        <FloatingHeart emoji="❤️" delay={0} offset={0} />
        <FloatingHeart emoji="🧡" delay={220} offset={0} />
        <FloatingHeart emoji="💛" delay={440} offset={0} />
      </View>

      <SobagiReaction
        emotion={currentEmotion}
        message={currentMessage}
        imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI}
      />

      {/* Hint — fades out as photocard button fades in */}
      <Animated.View style={[styles.hintWrapper, { opacity: hintOpacity }]} pointerEvents="none">
        <Text style={styles.hint}>화면을 탭하면 홈으로</Text>
      </Animated.View>

      {/* Photocard button section — fades in after 1000ms */}
      <Animated.View
        style={[styles.photocardSection, { opacity: photocardBtnAnim }]}
        pointerEvents={photocardBtnVisible ? 'auto' : 'none'}
      >
        <Pressable style={styles.photocardBtn} onPress={openPhotocard}>
          <Text style={styles.photocardBtnText}>포토카드 생성</Text>
        </Pressable>
        <Pressable onPress={handleClose}>
          <Text style={styles.dismissLink}>나중에 할게요</Text>
        </Pressable>
      </Animated.View>

      {/* Photocard modal — full-screen dark overlay */}
      {showPhotocardModal && (
        <Pressable style={styles.photocardModal} onPress={isRevealing ? undefined : closePhotocard}>
          <View style={styles.cardArea}>
            <PhotocardView
              quote={currentMessage}
              dateStr={dateStr}
              weekdayLabel={weekdayLabel}
              timeLabel={timeLabel}
              amount={todayTotal}
              records={photocardRecords}
              currentEmotion={currentEmotion}
              quoteAnimated
            />
            {/* White overlay fades out as the card develops */}
            <Animated.View
              style={[StyleSheet.absoluteFillObject, styles.revealOverlay, { opacity: revealAnim }]}
              pointerEvents="none"
            />
          </View>

          {/* Visual close affordance — tapping anywhere on modal also closes */}
          <View style={styles.closeHint} pointerEvents="none">
            <Text style={styles.closeHintText}>✕</Text>
          </View>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  heartsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    height: 40,
    marginBottom: 4,
  },
  heart: {
    fontSize: 20,
  },
  hintWrapper: {
    position: 'absolute',
    bottom: 48,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  photocardSection: {
    position: 'absolute',
    bottom: 32,
    left: 32,
    right: 32,
    alignItems: 'center',
    gap: 10,
  },
  photocardBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photocardBtnText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  dismissLink: {
    fontSize: 12,
    color: COLORS.textLight,
    paddingVertical: 4,
  },
  photocardModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A1410',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArea: {
    // PhotocardView provides its own fixed dimensions
  },
  revealOverlay: {
    borderRadius: 14,
    backgroundColor: '#FAF6EE',
  },
  closeHint: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeHintText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ScrollView } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { SobagiReaction } from '../components/sobagi/SobagiReaction';
import { PhotocardView, PhotocardRecord, CARD_WIDTH } from '../components/photocard/PhotocardView';
import { useEmotionStore } from '../store/emotionStore';
import { useExpenseStore } from '../store/expenseStore';
import { COLORS } from '../constants/colors';
import { SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS } from '../constants/assets';
import { SobagiEmotion } from '../types';
import { useUserStore } from '../store/userStore';
import { getDialogueTier } from '../services/dialogueService';
import { formatCategoryLabel } from '../constants/categories';
import { RecordKind } from '../types';
import { getLocalDateString, expenseLocalDate } from '../utils/date';
import { useAndroidBack } from '../hooks/useAndroidBack';

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
      // Title intentionally avoids the bubble's "처음 들렀네요 ✨" wording
      // (REACTION_POOLS[1].surprised) so the first-record moment doesn't echo
      // itself with a double ✨. Quieter leaf, marks the day's first step,
      // preserves the "first visit matters" warmth without the celebratory peak.
      case 'surprised': return '오늘 첫 걸음이네요 🌿';
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
  const lastKind = useEmotionStore((s) => s.lastKind);
  const lastRecordDate = useEmotionStore((s) => s.lastRecordDate);
  const recordedDaysCount = useUserStore((s) => s.recordedDaysCount);
  const expenses = useExpenseStore((s) => s.expenses);
  const tier = getDialogueTier(recordedDaysCount);

  const [photocardBtnVisible, setPhotocardBtnVisible] = useState(false);
  const [showPhotocardModal, setShowPhotocardModal] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const photocardBtnAnim = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(1)).current;
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hintOpacity = photocardBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  // The reaction reflects the record that triggered it — which may be a
  // back-dated save — not "today". `lastRecordDate` is the saved record's local
  // date (set in record.tsx); fall back to today for any non-save entry.
  const contextDate = lastRecordDate || getLocalDateString(new Date());
  const contextExpenses = useMemo(
    () => expenses.filter((e) => expenseLocalDate(e) === contextDate),
    [expenses, contextDate],
  );
  // Latest save's kind — drives the title's kind-aware branch. Read from the
  // emotion store (set alongside emotion/message at save time) rather than
  // derived from expenses, so a midnight rollover between save and reaction
  // render can't drop the record and mis-resolve the title.
  const latestKind: RecordKind = lastKind;
  // Photocard entry is gated on the context day having at least one *spending*
  // record (sub-spec B §5.2). Income-only and no-spend-only saves never expose
  // the photocard handoff. Auto-dismiss still runs; just no button.
  // NOTE: this is an INTENTIONAL divergence from Stats, which opens a card for
  // any recorded day. Reaction is the immediate emotional moment and is kept
  // quiet — surfacing a CTA on every income/no-spend save would make the flow
  // noisier; Stats is the reflective archive where any day can be revisited.
  // Not an unfinished inconsistency.
  const dateHasSpending = contextExpenses.some(
    (e) => e.kind !== 'income' && e.category !== 'no_spend',
  );
  // Source for the photocard's records block. Excludes no_spend (which is a
  // calendar marker, not a memory line). Income is INCLUDED so PhotocardView's
  // groupByKind can render the 들어온 기록 section on mixed days.
  const photocardSourceRecords = contextExpenses.filter((e) => e.category !== 'no_spend');
  // Photocard labels follow the record's date, not "now". The time badge only
  // makes sense for a real-time (today) save; back-dated saves omit it (their
  // createdAt is an anchored noon, not a real moment).
  const isContextToday = contextDate === getLocalDateString(new Date());
  const contextDt = new Date(contextDate + 'T00:00:00');
  const dateStr = formatNumericDate(contextDt);
  const weekdayLabel = WEEKDAY_LABELS[contextDt.getDay()];
  const timeLabel = isContextToday ? formatTimeLabel(new Date()) : undefined;
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

  // Android hardware back: while the photocard modal is open it must close the
  // modal first rather than popping the route. Active only while the modal is
  // open — when it's closed the default route-back behavior is left untouched.
  // During the reveal we swallow back (same as the disabled backdrop tap) so it
  // neither closes the modal nor pops the route mid-develop. No-op on iOS.
  const handleAndroidBack = useCallback(() => {
    if (isRevealing) return;
    closePhotocard();
  }, [isRevealing, closePhotocard]);
  useAndroidBack(showPhotocardModal, handleAndroidBack);

  useEffect(() => {
    // Auto-dismiss at 3500ms — always runs. Cancelled only when the
    // photocard button reveal supersedes it.
    autoTimerRef.current = setTimeout(handleClose, 3500);

    // Income-only or no-spend-only saves never expose the photocard handoff.
    // The auto-dismiss above carries the user back home on its own timer.
    if (!dateHasSpending) {
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
  }, [handleClose, dateHasSpending]);

  return (
    <View style={styles.container}>
      {/* Backdrop — only the empty background returns home. The content card and
          controls sit above it and absorb their own taps, so the reaction
          visual itself never dismisses by accident (manual check #2). */}
      <Pressable style={styles.backdrop} onPress={handleClose} />

      {/* Centered reaction card — absorbs its own presses, so tapping the title,
          hearts, or Sobagi does NOT close; only the surrounding background
          (the backdrop behind it) does. */}
      <Pressable style={styles.card} onPress={() => {}}>
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
      </Pressable>

      {/* Hint — pointer-transparent; taps fall through to the backdrop. */}
      <Animated.View style={[styles.hintWrapper, { opacity: hintOpacity }]} pointerEvents="none">
        <Text style={styles.hint}>화면을 탭하면 홈으로</Text>
      </Animated.View>

      {/* Photocard button section — sibling of the backdrop, fades in after
          1000ms. `box-none` lets taps in the surrounding gaps fall through to
          the backdrop (still closes), while the buttons capture their own
          presses and never bubble to handleClose. */}
      <Animated.View
        style={[styles.photocardSection, { opacity: photocardBtnAnim }]}
        pointerEvents={photocardBtnVisible ? 'box-none' : 'none'}
      >
        <Pressable style={styles.photocardBtn} onPress={openPhotocard}>
          <Text style={styles.photocardBtnText}>포토카드 생성</Text>
        </Pressable>
        <Pressable onPress={handleClose}>
          <Text style={styles.dismissLink}>나중에 할게요</Text>
        </Pressable>
      </Animated.View>

      {/* Photocard modal — full-screen dark overlay. Backdrop and card are
          separated: only the backdrop Pressable closes; the card absorbs its
          own presses (stopPropagation) so tapping the card never closes. */}
      {showPhotocardModal && (
        <Pressable style={styles.photocardModal} onPress={isRevealing ? undefined : closePhotocard}>
          {/* Bounded scroll: card-width so taps beside it still hit the backdrop
              and close. On normal screens the card fits — centered, no scroll,
              reads as a photo. On small screens a long quote + 4 records +
              overflow scrolls instead of clipping the card bottom. */}
          <ScrollView
            style={styles.cardScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Pressable style={styles.cardArea} onPress={(e) => e.stopPropagation()}>
              <PhotocardView
                quote={currentMessage}
                dateStr={dateStr}
                weekdayLabel={weekdayLabel}
                timeLabel={timeLabel}
                records={photocardRecords}
                currentEmotion={currentEmotion}
                quoteAnimated
              />
              {/* White overlay fades out as the card develops */}
              <Animated.View
                style={[StyleSheet.absoluteFillObject, styles.revealOverlay, { opacity: revealAnim }]}
                pointerEvents="none"
              />
            </Pressable>
          </ScrollView>

          {/* Visual close affordance — pointer-transparent, so taps fall through
              to the backdrop Pressable and close. */}
          <View style={styles.closeHint} pointerEvents="none">
            <Text style={styles.closeHintText}>✕</Text>
          </View>
        </Pressable>
      )}
    </View>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    alignItems: 'center',
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
  // Card-width + maxHeight: shrinks to the card (centered, no scroll) when it
  // fits; caps and scrolls on small screens so a tall card never clips.
  cardScroll: {
    width: CARD_WIDTH,
    maxHeight: '85%',
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

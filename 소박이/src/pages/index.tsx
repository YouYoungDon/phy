import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { RoomBackground } from '../components/room/RoomBackground';
import { SobagiCharacter } from '../components/sobagi/SobagiCharacter';
import { EmotionBubble } from '../components/sobagi/EmotionBubble';
import { DailySummary } from '../components/common/DailySummary';
import { BottomTabs } from '../components/common/BottomTabs';
import { useEmotionStore } from '../store/emotionStore';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore, getNextThreshold } from '../store/userStore';
import { useAppInit } from '../hooks/useAppInit';
import { getLocalDateString } from '../utils/date';
import { COLORS } from '../constants/colors';
import { ROOM_BACKGROUND_URIS, SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS } from '../constants/assets';

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: HomeScreen,
});

const IDLE_MESSAGES = [
  '반가워요 🌿',
  '오늘 하루는 어땠어요?',
  '차 한잔 하고 싶어요 ☕',
  '여기 있을게요',
  '천천히 해요',
  '오늘도 수고했어요',
  '조용히 있어도 괜찮아요',
  '뭔가 마실까요? 🍵',
  '같이 있을게요',
  '무슨 생각 하고 있어요?',
  '바람이 살랑이네요 🌸',
  '오늘 기분은 어때요?',
];

function HomeScreen() {
  useAppInit();

  const currentEmotion = useEmotionStore((s) => s.currentEmotion);
  const roomStage = useUserStore((s) => s.roomStage);
  const level = useUserStore((s) => s.level);
  const recordedDaysCount = useUserStore((s) => s.recordedDaysCount);
  const nextThreshold = getNextThreshold(recordedDaysCount);
  const expenses = useExpenseStore((s) => s.expenses);

  const todayExpenses = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return expenses.filter((e) => getLocalDateString(new Date(e.createdAt)) === todayStr);
  }, [expenses]);

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState('');
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndexRef = useRef(-1);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleSobagiTap = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    let idx = Math.floor(Math.random() * IDLE_MESSAGES.length);
    if (idx === lastIndexRef.current && IDLE_MESSAGES.length > 1) {
      idx = (idx + 1) % IDLE_MESSAGES.length;
    }
    lastIndexRef.current = idx;
    setBubbleMessage(IDLE_MESSAGES[idx] ?? '반가워요 🌿');
    setBubbleVisible(true);

    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
  }, []);

  return (
    <View style={styles.root}>
      <RoomBackground stage={roomStage} backgroundUri={ROOM_BACKGROUND_URIS[roomStage] ?? ROOM_BACKGROUND_URIS[1]}>
        <View style={styles.header}>
          <View style={styles.levelCard}>
            <View style={styles.levelRow}>
              <Text style={styles.levelText}>Lv.{level} 소박이</Text>
              <Text style={styles.progressLabel}>함께한 날 {recordedDaysCount} / {nextThreshold}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(Math.round((recordedDaysCount / nextThreshold) * 100), 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.characterArea} onPress={handleSobagiTap} activeOpacity={1}>
          <View style={styles.bubbleContainer} pointerEvents="none">
            <EmotionBubble message={bubbleMessage} visible={bubbleVisible} />
          </View>
          <SobagiCharacter emotion={currentEmotion} size="large" imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />
        </TouchableOpacity>
      </RoomBackground>

      <View style={styles.summaryCard}>
        <DailySummary totalAmount={todayTotal} recordCount={todayExpenses.length} />
      </View>

      <BottomTabs activeRoute="/" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  header: {
    position: 'absolute',
    top: 48,
    left: 16,
  },
  levelCard: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 7,
    minWidth: 160,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  characterArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '18%',   // feet at baseboard — matches room floor/wall boundary
    height: 240,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bubbleContainer: {
    position: 'absolute',
    bottom: 190,     // character height (180) + gap (10)
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.oliveGreen,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

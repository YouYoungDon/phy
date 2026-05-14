import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { RoomBackground } from '../components/room/RoomBackground';
import { SobagiCharacter } from '../components/sobagi/SobagiCharacter';
import { EmotionBubble } from '../components/sobagi/EmotionBubble';
import { DailySummary } from '../components/common/DailySummary';
import { BottomTabs } from '../components/common/BottomTabs';
import { useEmotionStore } from '../store/emotionStore';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { useAppInit } from '../hooks/useAppInit';
import { getLocalDateString } from '../utils/date';
import { COLORS } from '../constants/colors';
import { ROOM_BACKGROUND_URIS, SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS } from '../constants/assets';

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: HomeScreen,
});

function HomeScreen() {
  useAppInit();

  const currentEmotion = useEmotionStore((s) => s.currentEmotion);
  const rawMessage = useEmotionStore((s) => s.currentMessage);
  const currentMessage = rawMessage || '오늘도 잘 왔어요! 🌿';
  const roomStage = useUserStore((s) => s.roomStage);
  const level = useUserStore((s) => s.level);
  const expenses = useExpenseStore((s) => s.expenses);

  const todayExpenses = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return expenses.filter((e) => getLocalDateString(new Date(e.createdAt)) === todayStr);
  }, [expenses]);

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={styles.root}>
      <RoomBackground stage={roomStage} backgroundUri={ROOM_BACKGROUND_URIS[roomStage]}>
        {/* Level chip — overlaid on room top-left */}
        <View style={styles.header}>
          <View style={styles.levelChip}>
            <Text style={styles.levelText}>Lv.{level} 소박이</Text>
          </View>
        </View>

        {/* Sobagi + speech bubble — standing in the room */}
        <View style={styles.characterArea}>
          <EmotionBubble message={currentMessage} />
          <View style={styles.charGap} />
          <SobagiCharacter emotion={currentEmotion} size="large" imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />
        </View>
      </RoomBackground>

      {/* Diary summary card — between room and tabs */}
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
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelChip: {
    backgroundColor: COLORS.oliveGreen,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
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
    bottom: '18%',
    alignItems: 'center',
  },
  charGap: {
    height: 10,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});

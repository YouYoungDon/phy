import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { SobagiReaction } from '../components/sobagi/SobagiReaction';
import { useEmotionStore } from '../store/emotionStore';
import { COLORS } from '../constants/colors';
import { SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS } from '../constants/assets';
import { SobagiEmotion } from '../types';
import { useUserStore } from '../store/userStore';
import { getDialogueTier } from '../services/dialogueService';

export const Route = createRoute('/reaction', {
  validateParams: (params) => params,
  component: SobagiReactionScreen,
});

function getReactionTitle(emotion: SobagiEmotion, tier: 1 | 2 | 3): string {
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
  const tier = getDialogueTier(recordedDaysCount);

  const handleClose = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: '/' }] });
  }, [navigation]);

  useEffect(() => {
    const timer = setTimeout(handleClose, 3500);
    return () => clearTimeout(timer);
  }, [handleClose]);

  return (
    <Pressable style={styles.container} onPress={handleClose}>
      <Text style={styles.title}>{getReactionTitle(currentEmotion, tier)}</Text>

      <View style={styles.heartsRow}>
        <FloatingHeart emoji="❤️" delay={0} offset={0} />
        <FloatingHeart emoji="🧡" delay={220} offset={0} />
        <FloatingHeart emoji="💛" delay={440} offset={0} />
      </View>

      <SobagiReaction emotion={currentEmotion} message={currentMessage} imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />

      <Text style={styles.hint}>화면을 탭하면 홈으로</Text>
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
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: COLORS.textLight,
  },
});

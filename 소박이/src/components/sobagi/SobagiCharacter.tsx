import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { SobagiEmotion } from '../../types';
import { SobagiEmotionFace } from './SobagiEmotionFace';

const EMOTION_OVERLAY: Record<SobagiEmotion, string> = {
  happy:      '😊',
  excited:    '✨',
  surprised:  '😮',
  sleepy:     '💤',
  'soft-sad': '🌧️',
};

const SIZES = { small: 80, medium: 120, large: 180 };

interface SobagiCharacterProps {
  emotion: SobagiEmotion;
  size?: 'small' | 'medium' | 'large';
  showOverlay?: boolean;
  imageUri?: string;
}

export function SobagiCharacter({ emotion, size = 'medium', showOverlay = false, imageUri }: SobagiCharacterProps) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const idleY = useRef(new Animated.Value(0)).current;

  // Emotion-change spring pop
  useEffect(() => {
    scale.setValue(0.85);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 10,
      stiffness: 120,
    }).start();
  }, [emotion]);

  // Gentle idle float — loops forever
  useEffect(() => {
    const idle = Animated.loop(
      Animated.sequence([
        Animated.timing(idleY, {
          toValue: -5,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(idleY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    idle.start();
    return () => idle.stop();
  }, []);

  const px = SIZES[size];

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }, { translateY: idleY }] }]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: px, height: px }} resizeMode="contain" />
      ) : (
        <SobagiEmotionFace emotion={emotion} size={px} />
      )}
      {showOverlay && (
        <View style={styles.overlay}>
          <Text style={styles.overlayEmoji}>{EMOTION_OVERLAY[emotion]}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  overlayEmoji: {
    fontSize: 20,
  },
});

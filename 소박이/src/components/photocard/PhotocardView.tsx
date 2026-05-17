import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import { RoomBackground } from '../room/RoomBackground';
import { TimeOfDayTint } from '../../services/atmosphereService';
import { ALL_BAG_ITEMS, RoomPlacement, ZONE_SLOTS } from '../../constants/bagItems';
import { SobagiEmotion } from '../../types';

interface PhotocardViewProps {
  quote: string;
  dateStr: string;
  categories: string[];
  amount: number;
  roomStage: 1 | 2 | 3 | 4 | 5;
  backgroundUri?: string;
  sobagiImageUri: string;
  atmosphereTint: TimeOfDayTint | null;
  warmthOpacity: number;
  quoteAnimated?: boolean;
  placedItems?: RoomPlacement[];
  currentEmotion?: SobagiEmotion;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - 48;
export const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9));

const SOFT_SHADOW = {
  textShadowColor: 'rgba(26, 20, 16, 0.45)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

export function PhotocardView({
  quote,
  dateStr,
  categories,
  amount,
  roomStage,
  backgroundUri,
  sobagiImageUri,
  atmosphereTint,
  warmthOpacity,
  quoteAnimated = false,
  placedItems,
  currentEmotion,
}: PhotocardViewProps) {
  const quoteOpacity = useRef(new Animated.Value(quoteAnimated ? 0 : 1)).current;

  useEffect(() => {
    if (!quoteAnimated) return;
    const timer = setTimeout(() => {
      Animated.timing(quoteOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const displayQuote = quote.trim() || '오늘의 기록이 조용히 남았어요.';

  return (
    <View style={styles.card}>
      {/* Room background */}
      <View style={StyleSheet.absoluteFillObject}>
        <RoomBackground stage={roomStage} backgroundUri={backgroundUri} />
      </View>

      {/* Atmosphere tint */}
      {atmosphereTint && (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: atmosphereTint.color, opacity: atmosphereTint.opacity }]}
          pointerEvents="none"
        />
      )}

      {/* Warmth overlay */}
      {warmthOpacity > 0 && (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E8C070', opacity: warmthOpacity }]}
          pointerEvents="none"
        />
      )}

      {/* Room item overlay — placed items whose emotion affinity matches this moment.
          Subtler than the home render: smaller, lower opacity, no labels. The items
          sit inside the photographed room, behind Sobagi and the memory strip. */}
      {placedItems && currentEmotion && placedItems.map((placement) => {
        const item = ALL_BAG_ITEMS.find((i) => i.id === placement.itemId);
        if (!item?.photocardAffinity?.includes(currentEmotion)) return null;
        const slot = ZONE_SLOTS[placement.zone]?.[0];
        if (!slot) return null;
        return (
          <View
            key={placement.itemId}
            pointerEvents="none"
            style={{ position: 'absolute', left: slot.x * CARD_WIDTH, top: slot.y * CARD_HEIGHT }}
          >
            <Text style={styles.photocardRoomItemEmoji}>{item.emoji}</Text>
          </View>
        );
      })}

      {/* Composition: Sobagi left + memory strip right */}
      <View style={styles.composition} pointerEvents="none">
        <View style={styles.sobagiSide}>
          <Image source={{ uri: sobagiImageUri }} style={styles.sobagiImage} resizeMode="contain" />
        </View>

        <View style={styles.memorySide}>
          {amount > 0 && (
            <Text style={styles.memoryAmount}>{amount.toLocaleString()}원</Text>
          )}
          {categories.length > 0 && (
            <Text style={styles.memoryCategories}>{categories.join(' · ')}</Text>
          )}
          <Animated.View style={[styles.memoryQuoteWrap, { opacity: quoteOpacity }]}>
            <Text style={styles.memoryQuote}>"{displayQuote}"</Text>
          </Animated.View>
        </View>
      </View>

      {/* Date — bottom-right corner, like a photograph signature */}
      <View style={styles.dateSig} pointerEvents="none">
        <Text style={styles.dateSigText}>{dateStr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Horizontal composition — Sobagi left, memory strip right
  composition: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 56, // bias content slightly above vertical center
  },
  sobagiSide: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sobagiImage: {
    width: 130,
    height: 130,
  },

  // Memory strip — soft stacked text, no boxes, no labels
  memorySide: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(20, 10, 4, 0.14)',
    borderRadius: 4,
  },
  memoryAmount: {
    fontSize: 17,
    fontWeight: '300',
    color: 'rgba(255, 253, 248, 0.92)',
    letterSpacing: 0.3,
    marginBottom: 3,
    ...SOFT_SHADOW,
  },
  memoryCategories: {
    fontSize: 10,
    color: 'rgba(255, 253, 248, 0.60)',
    letterSpacing: 0.5,
    fontStyle: 'italic',
    marginBottom: 10,
    textShadowColor: 'rgba(26, 20, 16, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  memoryQuoteWrap: {},
  memoryQuote: {
    fontSize: 10,
    fontStyle: 'italic',
    color: 'rgba(255, 253, 248, 0.84)',
    lineHeight: 15,
    ...SOFT_SHADOW,
  },

  // Room item overlay — emoji-only, no label, no animation, sits inside the room
  photocardRoomItemEmoji: {
    fontSize: 13,
    opacity: 0.45,
  },

  // Date signature — bottom-right, barely visible
  dateSig: {
    position: 'absolute',
    bottom: 14,
    right: 18,
  },
  dateSigText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: 'rgba(255, 253, 248, 0.40)',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(26, 20, 16, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

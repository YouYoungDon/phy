import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PebbleJarProps {
  position: { x: number; y: number };
  pebbleCount: number;
  onPress: () => void;
}

// Fill stages map to opacity + scale on a single emoji. Empty →
// barely visible, overflowing → fully opaque with a small scale-up.
// The spec's rationale: emoji-only assets can't change glyph by fill
// level, so we use opacity/scale instead — and the restraint matches
// the room's existing low-key visual vocabulary.
function fillStage(count: number): { opacity: number; scale: number } {
  if (count >= 200) return { opacity: 1.0, scale: 1.08 };
  if (count >= 50) return { opacity: 0.8, scale: 1.0 };
  if (count >= 10) return { opacity: 0.6, scale: 1.0 };
  return { opacity: 0.4, scale: 1.0 };
}

export function PebbleJar({ position, pebbleCount, onPress }: PebbleJarProps) {
  const stage = fillStage(pebbleCount);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.jar,
        {
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          opacity: stage.opacity,
          transform: [{ scale: stage.scale }],
        },
      ]}
      hitSlop={8}
    >
      <Text style={styles.jarEmoji}>🫙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  jar: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jarEmoji: {
    fontSize: 28,
  },
});

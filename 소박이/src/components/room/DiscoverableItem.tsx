import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

// A single gentle arrival waiting to be found & picked up. It is the ONLY floor
// object that moves — a very soft breathing-scale + micro-float marks it as
// quietly alive (and therefore tappable), while the room's painted props stay
// completely static. The motion-contrast IS the affordance language: "the thing
// that moves is the thing you can pick up," which never implies the room itself
// is interactive. Geometric motion only — no glow, pulse, opacity-blink, spring,
// or sparkle. A breath, not a beat: long period, tiny amplitude, symmetric
// sine ease, so it reads as "softly noticeable", never "spawned collectible".
export function DiscoverableItem({ emoji, onPress }: { emoji: string; onPress: () => void }) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const translateY = breath.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] });

  return (
    <Pressable style={styles.discoverable} onPress={onPress}>
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Text style={styles.roomItemEmoji}>{emoji}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Sits on the floor to the right — clear of the centered character and the
  // left-edge utility column. Calm spot, comfortable tap target.
  discoverable: {
    position: 'absolute',
    right: '10%',
    top: '62%',
    padding: 8,
  },
  roomItemEmoji: {
    fontSize: 16,
    opacity: 0.6,
  },
});

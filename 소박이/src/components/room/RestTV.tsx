import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { ROOM_FURNITURE_URIS } from '../../constants/assets';
import type { RestAdStatus } from '../../hooks/useRestedAd';
import { REST_DAILY_CAP } from '../../services/restService';

interface RestTVProps {
  position: { x: number; y: number };
  adStatus: RestAdStatus;
  effectiveRestsToday: number;
  onPress: () => void;
}

// Visual treatment for the four runtime states. Available = 0.85,
// loading = 0.55, done/error = 0.35. Matches the spec's state table.
function opacityFor(adStatus: RestAdStatus, effectiveRestsToday: number): number {
  if (effectiveRestsToday >= REST_DAILY_CAP) return 0.35;
  if (adStatus === 'error') return 0.35;
  if (adStatus === 'loading') return 0.55;
  return 0.85;
}

export function RestTV({ position, adStatus, effectiveRestsToday, onPress }: RestTVProps) {
  // When the SDK is unsupported the TV never renders — no fallback messaging.
  if (adStatus === 'unsupported') return null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tv,
        { left: `${position.x * 100}%`, top: `${position.y * 100}%`, opacity: opacityFor(adStatus, effectiveRestsToday) },
      ]}
      hitSlop={8}
    >
      <Image
        source={{ uri: ROOM_FURNITURE_URIS.tv }}
        style={styles.tvImage}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tv: {
    position: 'absolute',
    width: 56,
    height: 56,
  },
  tvImage: {
    width: 56,
    height: 56,
  },
});

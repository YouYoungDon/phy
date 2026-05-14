import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const BASEBOARD = '#A07850';
const WINDOW_FRAME = '#8B6F47';
const WINDOW_GLASS = '#E5EFD8'; // warm leafy light, not cold sky blue
const RUG = '#B89898';

const STAGE_WALL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#F5EDE0',
  2: '#F3E9D8',
  3: '#F0E4CF',
  4: '#EEDFC6',
  5: '#ECDABD',
};
const STAGE_FLOOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#D4B896',
  2: '#D0B28E',
  3: '#CCAC86',
  4: '#C8A47E',
  5: '#C49E76',
};

interface RoomBackgroundProps {
  stage: 1 | 2 | 3 | 4 | 5;
  backgroundUri?: string;
  children?: React.ReactNode;
}

export function RoomBackground({ stage, backgroundUri, children }: RoomBackgroundProps) {
  if (backgroundUri) {
    return (
      <View style={styles.root}>
        <Image source={{ uri: backgroundUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <View style={StyleSheet.absoluteFillObject}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.wall, { backgroundColor: STAGE_WALL[stage] }]} />
      <View style={[styles.floor, { backgroundColor: STAGE_FLOOR[stage] }]} />
      <View style={styles.baseboard} />
      <View style={styles.window}>
        <View style={styles.windowPaneV} />
        <View style={styles.windowPaneH} />
      </View>
      {stage === 2 && <Text style={styles.plantSmall}>🌱</Text>}
      {stage >= 3 && <Text style={styles.plantBig}>🪴</Text>}
      {stage >= 3 && <View style={styles.rug} />}
      {stage >= 4 && <Text style={styles.books}>📚</Text>}
      {stage >= 5 && <Text style={styles.lamp}>🕯️</Text>}
      <View style={StyleSheet.absoluteFillObject}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  wall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '18%',
  },
  floor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '18%',
  },
  baseboard: {
    position: 'absolute',
    bottom: '18%',
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: BASEBOARD,
  },
  window: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: WINDOW_FRAME,
    backgroundColor: WINDOW_GLASS,
    overflow: 'hidden',
  },
  windowPaneV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 3,
    backgroundColor: WINDOW_FRAME,
    marginLeft: -1.5,
  },
  windowPaneH: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: WINDOW_FRAME,
    marginTop: -1.5,
  },
  plantSmall: {
    position: 'absolute',
    right: 28,
    bottom: '18%',
    fontSize: 36,
  },
  plantBig: {
    position: 'absolute',
    right: 28,
    bottom: '18%',
    fontSize: 48,
  },
  rug: {
    position: 'absolute',
    bottom: '16%',
    left: '15%',
    right: '15%',
    height: 10,
    borderRadius: 5,
    backgroundColor: RUG,
    opacity: 0.55,
  },
  books: {
    position: 'absolute',
    top: 68,
    left: 24,
    fontSize: 28,
  },
  lamp: {
    position: 'absolute',
    top: 64,
    left: 100,
    fontSize: 28,
  },
});

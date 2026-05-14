import React from 'react';
import { View, Text } from 'react-native';
import { SobagiEmotion } from '../../types';

const BG: Record<SobagiEmotion, string> = {
  happy:      '#FFF8EE',
  excited:    '#FFFBE0',
  surprised:  '#EDFBF0',
  'soft-sad': '#EFF3FB',
  sleepy:     '#F3F0FC',
};

interface SobagiEmotionFaceProps {
  emotion: SobagiEmotion;
  size: number;
}

export function SobagiEmotionFace({ emotion, size }: SobagiEmotionFaceProps) {
  const eb = Math.round(size * 0.088);   // eye base unit
  const es = Math.round(size * 0.20);    // eye x-offset from center
  const eyeTop = Math.round(size * 0.34);
  const mw = Math.round(size * 0.22);    // mouth width reference
  const ck = Math.round(size * 0.11);    // cheek size
  const cx = size / 2;
  const bw = Math.max(Math.round(mw * 0.1), 2.5); // border width for arcs

  const { eyeW, eyeH } = getEyeSize(emotion, eb);
  const eyeR = Math.min(eyeW, eyeH) / 2;

  const showCheeks = emotion === 'happy' || emotion === 'excited';
  const showTears  = emotion === 'soft-sad';
  const showZzz    = emotion === 'sleepy';

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: BG[emotion], overflow: 'hidden' }}>

      {/* Cheeks */}
      {showCheeks && (
        <>
          <View style={{ position: 'absolute', width: ck, height: Math.round(ck * 0.65), borderRadius: Math.round(ck * 0.33), backgroundColor: '#F4A0A0', opacity: 0.4, top: Math.round(size * 0.47), left: Math.round(size * 0.10) }} />
          <View style={{ position: 'absolute', width: ck, height: Math.round(ck * 0.65), borderRadius: Math.round(ck * 0.33), backgroundColor: '#F4A0A0', opacity: 0.4, top: Math.round(size * 0.47), right: Math.round(size * 0.10) }} />
        </>
      )}

      {/* Left eye */}
      <View style={{ position: 'absolute', width: eyeW, height: eyeH, borderRadius: eyeR, backgroundColor: '#3D3020', top: eyeTop, left: Math.round(cx - es - eyeW / 2) }} />

      {/* Right eye */}
      <View style={{ position: 'absolute', width: eyeW, height: eyeH, borderRadius: eyeR, backgroundColor: '#3D3020', top: eyeTop, left: Math.round(cx + es - eyeW / 2) }} />

      {/* Tears */}
      {showTears && (
        <>
          <View style={{ position: 'absolute', width: 3, height: 6, borderRadius: 2, backgroundColor: '#7FA0D8', opacity: 0.75, top: Math.round(size * 0.44), left: Math.round(cx - es + eyeW * 0.25) }} />
          <View style={{ position: 'absolute', width: 3, height: 6, borderRadius: 2, backgroundColor: '#7FA0D8', opacity: 0.75, top: Math.round(size * 0.44), left: Math.round(cx + es - eyeW * 0.5) }} />
        </>
      )}

      {/* Mouth */}
      {renderMouth(emotion, mw, bw, size, cx)}

      {/* Sleepy z */}
      {showZzz && (
        <Text style={{ position: 'absolute', top: Math.round(size * 0.08), right: Math.round(size * 0.13), fontSize: Math.round(size * 0.12), color: '#8B84C4', opacity: 0.75 }}>z</Text>
      )}
    </View>
  );
}

function getEyeSize(emotion: SobagiEmotion, eb: number): { eyeW: number; eyeH: number } {
  switch (emotion) {
    case 'happy':     return { eyeW: Math.round(eb * 1.8), eyeH: Math.max(Math.round(eb * 0.45), 2) };
    case 'excited':   return { eyeW: Math.round(eb * 1.3), eyeH: Math.round(eb * 1.3) };
    case 'surprised': return { eyeW: Math.round(eb * 1.45), eyeH: Math.round(eb * 1.45) };
    case 'soft-sad':  return { eyeW: Math.round(eb * 1.0), eyeH: Math.round(eb * 1.0) };
    case 'sleepy':    return { eyeW: Math.round(eb * 1.8), eyeH: Math.max(Math.round(eb * 0.28), 2) };
  }
}

// Smile arc: shows the BOTTOM half of a circle border = U shape
function SmileArc({ w, top, left, borderWidth, color }: { w: number; top: number; left: number; borderWidth: number; color: string }) {
  const h = Math.round(w * 0.48);
  return (
    <View style={{ position: 'absolute', width: w, height: h, top, left, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', bottom: 0, width: w, height: w, borderRadius: w / 2, borderWidth, borderColor: color, borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
    </View>
  );
}

// Frown arc: shows the TOP half of a circle border = inverted U shape
function FrownArc({ w, top, left, borderWidth, color }: { w: number; top: number; left: number; borderWidth: number; color: string }) {
  const h = Math.round(w * 0.48);
  return (
    <View style={{ position: 'absolute', width: w, height: h, top, left, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', top: 0, width: w, height: w, borderRadius: w / 2, borderWidth, borderColor: color, borderBottomColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
    </View>
  );
}

function renderMouth(emotion: SobagiEmotion, mw: number, bw: number, size: number, cx: number): React.ReactNode {
  const color = '#5C4A38';

  switch (emotion) {
    case 'happy':
      return <SmileArc w={mw} top={Math.round(size * 0.60)} left={Math.round(cx - mw / 2)} borderWidth={bw} color={color} />;

    case 'excited': {
      const ew = Math.round(mw * 1.25);
      return <SmileArc w={ew} top={Math.round(size * 0.58)} left={Math.round(cx - ew / 2)} borderWidth={bw} color={color} />;
    }

    case 'surprised': {
      const os = Math.round(mw * 0.48);
      const oh = Math.round(os * 1.2);
      const or_ = Math.round(Math.max(os, oh) / 2);
      return <View style={{ position: 'absolute', width: os, height: oh, borderRadius: or_, borderWidth: bw, borderColor: color, top: Math.round(size * 0.61), left: Math.round(cx - os / 2) }} />;
    }

    case 'soft-sad': {
      const fw = Math.round(mw * 0.7);
      return <FrownArc w={fw} top={Math.round(size * 0.63)} left={Math.round(cx - fw / 2)} borderWidth={bw} color={color} />;
    }

    case 'sleepy': {
      const nw = Math.round(mw * 0.5);
      return <View style={{ position: 'absolute', width: nw, height: Math.max(Math.round(mw * 0.08), 2.5), borderRadius: 2, backgroundColor: color, opacity: 0.75, top: Math.round(size * 0.62), left: Math.round(cx - nw / 2) }} />;
    }
  }
}

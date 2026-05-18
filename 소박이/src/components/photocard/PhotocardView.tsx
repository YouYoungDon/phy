import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import { TimeOfDayTint } from '../../services/atmosphereService';
import { SobagiEmotion } from '../../types';
import {
  PhotocardMoodAsset,
  PHOTOCARD_MOOD_URIS,
} from '../../constants/assets';
import {
  getPhotocardMoodAsset,
  PhotocardSpendingLevel,
  PhotocardWeather,
} from '../../services/photocardMoodService';

// Public types — exported for callers
export type PhotocardRecord = {
  id?: string;
  category?: string;
  categoryLabel?: string;
  amount: number;
  memo?: string;
};

const CATEGORY_ICON: Record<string, string> = {
  cafe: '☕',
  food: '🍴',
  transport: '🚌',
  shopping: '🛍️',
  other: '📦',
};

interface PhotocardViewProps {
  // Content
  quote: string;
  dateStr: string;
  amount: number;
  records?: PhotocardRecord[];
  weekdayLabel?: string;
  timeLabel?: string;

  // Mood asset — explicit override, else resolved from currentEmotion + current hour
  moodAsset?: PhotocardMoodAsset;
  currentEmotion?: SobagiEmotion;
  weather?: PhotocardWeather;
  spendingLevel?: PhotocardSpendingLevel;

  // Animation
  quoteAnimated?: boolean;

  // Legacy props — accepted for backward compatibility, no longer rendered in
  // the split layout (the dynamic room scene has been replaced by mood assets).
  categories?: string[];
  roomStage?: 1 | 2 | 3 | 4 | 5;
  backgroundUri?: string;
  sobagiImageUri?: string;
  atmosphereTint?: TimeOfDayTint | null;
  warmthOpacity?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - 48;
export const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9));

const VISIBLE_RECORDS = 3;

export function PhotocardView({
  quote,
  dateStr,
  amount,
  records,
  weekdayLabel,
  timeLabel,
  moodAsset,
  currentEmotion,
  weather,
  spendingLevel,
  quoteAnimated = false,
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

  const resolvedAsset: PhotocardMoodAsset =
    moodAsset ??
    getPhotocardMoodAsset({
      hour: new Date().getHours(),
      emotion: currentEmotion,
      weather,
      spendingLevel,
    });
  const assetUri = PHOTOCARD_MOOD_URIS[resolvedAsset];

  const visibleRecords = (records ?? []).slice(0, VISIBLE_RECORDS);
  const overflowCount = Math.max(0, (records?.length ?? 0) - VISIBLE_RECORDS);

  const displayQuote = quote.trim() || '오늘의 기록이 조용히 남았어요.';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* LEFT — emotional visual panel (mood asset). Image fills the panel via cover;
            tiny time badge sits top-right if provided. */}
        <View style={styles.leftPanel}>
          <Image source={{ uri: assetUri }} style={styles.leftImage} resizeMode="cover" />
          {timeLabel ? (
            <View style={styles.timeBadge} pointerEvents="none">
              <Text style={styles.timeBadgeText}>{timeLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* RIGHT — structured spending summary on cream paper. */}
        <View style={styles.rightPanel}>
          <View style={styles.headerBlock}>
            <Text style={styles.dateHeader}>{dateStr}</Text>
            {weekdayLabel ? (
              <Text style={styles.weekdaySub}>{weekdayLabel} · 오늘의 기록</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>총 금액</Text>
            <Text style={styles.totalAmount}>₩ {amount.toLocaleString('ko-KR')}</Text>
          </View>

          <View style={styles.divider} />

          {visibleRecords.length > 0 && (
            <View style={styles.recordsBlock}>
              {visibleRecords.map((r, idx) => {
                const icon = r.category ? CATEGORY_ICON[r.category] ?? '·' : '·';
                const label = r.categoryLabel ?? r.category ?? '';
                return (
                  <View key={r.id ?? idx}>
                    {idx > 0 && <View style={styles.recordDivider} />}
                    <View style={styles.recordRow}>
                      <View style={styles.recordIconWrap}>
                        <Text style={styles.recordIcon}>{icon}</Text>
                      </View>
                      <View style={styles.recordTextCol}>
                        <Text style={styles.recordCategory}>{label}</Text>
                        {r.memo ? (
                          <Text style={styles.recordMemo} numberOfLines={1}>{r.memo}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.recordAmount}>₩ {r.amount.toLocaleString('ko-KR')}</Text>
                    </View>
                  </View>
                );
              })}
              {overflowCount > 0 && (
                <Text style={styles.overflowText}>+ {overflowCount}개 더</Text>
              )}
            </View>
          )}

          <View style={styles.spacer} />

          <View style={styles.noteBlock}>
            <Text style={styles.noteHeading}>🌱 오늘의 한 줄</Text>
            <Animated.View style={{ opacity: quoteOpacity }}>
              <Text style={styles.noteText}>{displayQuote}</Text>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

const PAPER_BG = '#FAF6EE';
const PAPER_BG_SOFT = '#F3ECDE';
const TEXT_DARK = '#3D3020';
const TEXT_MUTED = '#7A6A56';
const DIVIDER = 'rgba(61, 48, 32, 0.10)';

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: PAPER_BG,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },

  // ─── Left panel ─────────────────────────────────────────────────────────────
  leftPanel: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: PAPER_BG_SOFT,
  },
  leftImage: {
    width: '100%',
    height: '100%',
  },
  timeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(250, 246, 238, 0.78)',
  },
  timeBadgeText: {
    fontSize: 10,
    color: TEXT_DARK,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ─── Right panel ────────────────────────────────────────────────────────────
  rightPanel: {
    flex: 1,
    backgroundColor: PAPER_BG,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  headerBlock: {
    marginBottom: 10,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.4,
  },
  weekdaySub: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 10,
  },
  totalBlock: {
    gap: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 0.3,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.5,
  },
  recordsBlock: {
    gap: 0,
  },
  recordDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PAPER_BG_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIcon: {
    fontSize: 12,
  },
  recordTextCol: {
    flex: 1,
    minWidth: 0,
  },
  recordCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  recordMemo: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  recordAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  overflowText: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 8,
    textAlign: 'right',
  },
  spacer: {
    flex: 1,
    minHeight: 8,
  },
  noteBlock: {
    backgroundColor: PAPER_BG_SOFT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteHeading: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 12,
    color: TEXT_DARK,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
});

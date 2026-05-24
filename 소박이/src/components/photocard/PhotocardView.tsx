import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import { TimeOfDayTint } from '../../services/atmosphereService';
import { SobagiEmotion, ExpenseCategory } from '../../types';
import {
  PhotocardMoodAsset,
  PHOTOCARD_MOOD_URIS,
} from '../../constants/assets';
import {
  getPhotocardMoodAsset,
  PhotocardSpendingLevel,
  PhotocardWeather,
} from '../../services/photocardMoodService';
import { CATEGORY_BY_TOKEN } from '../../constants/categories';
import { PhotocardRecord, groupByKind } from './photocardGrouping';

// Re-export so existing callers continue to import from PhotocardView
export type { PhotocardRecord } from './photocardGrouping';

interface PhotocardViewProps {
  // Content
  quote: string;
  dateStr: string;
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
export const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.667);

const VISIBLE_RECORDS = 3;

export function PhotocardView({
  quote,
  dateStr,
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

  // Group records by kind first, then slice across groups in order
  // (spending → income → noSpend) capped at VISIBLE_RECORDS total. Overflow
  // counts records that didn't make the visible cut from any group.
  const allRecords = records ?? [];
  const allGroups = groupByKind(allRecords);
  let remaining = VISIBLE_RECORDS;
  const take = <T,>(arr: readonly T[]): T[] => {
    const slice = arr.slice(0, Math.max(0, remaining));
    remaining -= slice.length;
    return slice;
  };
  const shownSpending = take(allGroups.spending);
  const shownIncome = take(allGroups.income);
  const shownNoSpend = take(allGroups.noSpend);
  const shownTotal = shownSpending.length + shownIncome.length + shownNoSpend.length;
  const overflowCount = Math.max(0, allRecords.length - shownTotal);

  const displayQuote = quote.trim() || '오늘의 기록이 조용히 남았어요.';

  // Local render — one row per record. Caller provides idx for the
  // intra-group divider rule (first row in a group has no preceding divider).
  const renderRecordRow = (r: PhotocardRecord, idx: number) => {
    const icon = r.category
      ? CATEGORY_BY_TOKEN[r.category as ExpenseCategory]?.emoji ?? '·'
      : '·';
    const label = r.categoryLabel ?? r.category ?? '';
    const lineText = r.memo ? `${label} · ${r.memo}` : label;
    return (
      <View key={r.id ?? idx}>
        {idx > 0 && <View style={styles.recordDivider} />}
        <View style={styles.recordRow}>
          <Text style={styles.recordIcon}>{icon}</Text>
          <Text style={styles.recordLine} numberOfLines={1}>{lineText}</Text>
          {(r.kind !== 'income' || r.amount > 0) && (
            <Text style={styles.recordAmount}>₩ {r.amount.toLocaleString('ko-KR')}</Text>
          )}
        </View>
      </View>
    );
  };

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

          {/* Records grouped by kind. Each group renders only when it has
              visible rows. Group labels are 9pt muted — quiet separators,
              not section titles. No per-group subtotals; no aggregate total
              block (removed in sub-spec B; the Sobagi quote at the bottom
              carries the emotional weight instead). */}
          {shownTotal > 0 && (
            <View style={styles.recordsBlock}>
              {shownSpending.length > 0 && (
                <View style={styles.groupSection}>
                  <Text style={styles.groupLabel}>쓴 기록</Text>
                  {shownSpending.map(renderRecordRow)}
                </View>
              )}
              {shownIncome.length > 0 && (
                <View style={styles.groupSection}>
                  <Text style={styles.groupLabel}>들어온 기록</Text>
                  {shownIncome.map(renderRecordRow)}
                </View>
              )}
              {shownNoSpend.length > 0 && (
                <View style={styles.groupSection}>
                  <Text style={styles.groupLabel}>무지출</Text>
                  {shownNoSpend.map(renderRecordRow)}
                </View>
              )}
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

  // ─── Left panel — ~48% width, asset fills via cover ─────────────────────────
  leftPanel: {
    flex: 0.92,
    overflow: 'hidden',
    backgroundColor: PAPER_BG_SOFT,
  },
  leftImage: {
    width: '100%',
    height: '100%',
  },
  timeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(250, 246, 238, 0.82)',
  },
  timeBadgeText: {
    fontSize: 9,
    color: TEXT_DARK,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ─── Right panel — ~52% width, compact landscape density ────────────────────
  rightPanel: {
    flex: 1.08,
    backgroundColor: PAPER_BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerBlock: {
    marginBottom: 6,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.4,
  },
  weekdaySub: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 6,
  },
  recordsBlock: {
    gap: 0,
  },
  groupSection: {
    marginTop: 6,
  },
  groupLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    letterSpacing: 0.3,
    marginBottom: 4,
    fontWeight: '500',
  },
  recordDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 5,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordIcon: {
    fontSize: 12,
    width: 16,
    textAlign: 'center',
  },
  recordLine: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  recordAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  overflowText: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 5,
    textAlign: 'right',
  },
  spacer: {
    flex: 1,
    minHeight: 4,
  },
  noteBlock: {
    backgroundColor: PAPER_BG_SOFT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  noteHeading: {
    fontSize: 9,
    color: TEXT_MUTED,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  noteText: {
    fontSize: 11,
    color: TEXT_DARK,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
});

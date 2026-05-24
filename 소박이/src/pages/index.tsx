import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { RoomBackground } from '../components/room/RoomBackground';
import { SobagiCharacter } from '../components/sobagi/SobagiCharacter';
import { EmotionBubble } from '../components/sobagi/EmotionBubble';
import { DailySummary } from '../components/common/DailySummary';
import { BottomTabs } from '../components/common/BottomTabs';
import { useEmotionStore } from '../store/emotionStore';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore, getNextThreshold } from '../store/userStore';
import { useAppInit } from '../hooks/useAppInit';
import { getLocalDateString, expenseLocalDate } from '../utils/date';
import { COLORS } from '../constants/colors';
import { ROOM_BACKGROUND_URIS, SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS, UTILITY_ICON_URIS } from '../constants/assets';
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { FINDABLE_ITEMS, FindableItem } from '../constants/findableItems';
import { PERSONAL_LETTERS, ALL_SEASONAL_LETTERS } from '../constants/letters';
import { REST_LETTERS } from '../constants/restLetters';
import { getTimeOfDayTint, getWarmthOpacity, getCalmAtmosphereOpacity, CALM_OVERLAY_COLOR, getRestWarmthOpacity } from '../services/atmosphereService';
import { BAG_ITEMS, BAG_TABS, BagItem, BagTab, ALL_BAG_ITEMS, RoomPlacement, ZONE_SLOTS } from '../constants/bagItems';
import { RestTV } from '../components/room/RestTV';
import { PebbleJar } from '../components/room/PebbleJar';
import { RestPrompt } from '../components/room/RestPrompt';
import { useRestedAd } from '../hooks/useRestedAd';
import { getEffectiveRestsToday, grantRest } from '../services/restService';

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: HomeScreen,
});

type MailboxLetter = { id: string; body: string; sig: string };

function buildLetterLookup(): Map<string, MailboxLetter> {
  const map = new Map<string, MailboxLetter>();
  for (const l of PERSONAL_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  for (const l of ALL_SEASONAL_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  for (const l of REST_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  return map;
}

const LETTER_LOOKUP = buildLetterLookup();


const IDLE_MESSAGES = [
  '반가워요 🌿',
  '오늘 하루는 어땠어요?',
  '차 한잔 하고 싶어요 ☕',
  '여기 있을게요',
  '천천히 해요',
  '오늘도 들렀네요',
  '조용히 있어도 괜찮아요',
  '뭔가 마실까요? 🍵',
  '같이 있을게요',
  '무슨 생각 하고 있어요?',
  '바람이 살랑이네요 🌸',
  '오늘 기분은 어때요?',
];

const REST_IDLE_MESSAGES = [
  '잠깐 쉬다 왔어요 🌿',
  '좋은 채널이었어요 📺',
  '한 숨 돌리니 좋네요 🌿',
];

function getIdleMessages(lastRestAtISO: string | null, now: Date): string[] {
  if (lastRestAtISO === null) return IDLE_MESSAGES;
  const minsSince = (now.getTime() - Date.parse(lastRestAtISO)) / 60_000;
  if (minsSince < 0 || minsSince >= 60) return IDLE_MESSAGES;
  return [...IDLE_MESSAGES, ...REST_IDLE_MESSAGES];
}

// Normalized room coordinates. MAILBOX_POSITION represents the visual
// location of the mailbox utility icon — the utility stack itself stays
// pixel-positioned in its existing styles; this constant is the source of
// truth for room-layer fixtures that anchor below it.
const MAILBOX_POSITION = { x: 0.12, y: 0.29 } as const;
const TV_POSITION = {
  x: MAILBOX_POSITION.x + 0.02,
  y: MAILBOX_POSITION.y + 0.16,
};
const JAR_POSITION = { x: 0.18, y: 0.66 } as const;

function HomeScreen() {
  useAppInit();

  const currentEmotion = useEmotionStore((s) => s.currentEmotion);
  const roomStage = useUserStore((s) => s.roomStage);
  const level = useUserStore((s) => s.level);
  const recordedDaysCount = useUserStore((s) => s.recordedDaysCount);
  const nextThreshold = getNextThreshold(recordedDaysCount);
  const expenses = useExpenseStore((s) => s.expenses);
  const pebbleCount = useUserStore((s) => s.pebbleCount);
  const restsToday = useUserStore((s) => s.restsToday);
  const lastRestDate = useUserStore((s) => s.lastRestDate);
  const lastRestAt = useUserStore((s) => s.lastRestAt);
  const adState = useRestedAd();
  const todayStr = getLocalDateString(new Date());
  const effectiveRestsToday = getEffectiveRestsToday(restsToday, lastRestDate, todayStr);
  const timeOfDayTint = getTimeOfDayTint(new Date().getHours());
  const warmthOpacity = getWarmthOpacity(recordedDaysCount);
  const calmOpacity = getCalmAtmosphereOpacity(expenses, getLocalDateString(new Date()));

  const todayExpenses = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return expenses.filter((e) => expenseLocalDate(e) === todayStr);
  }, [expenses]);

  // Spending only — income records and no-spend markers don't count toward
  // the day's spending total, so a salary-only day reads ₩0, not the salary.
  const todayTotal = todayExpenses
    .filter((e) => e.kind !== 'income' && e.category !== 'no_spend')
    .reduce((sum, e) => sum + e.amount, 0);

  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState('');
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndexRef = useRef(-1);

  type SheetType = 'mailbox' | 'bag' | 'rest';
  const [activeSheet, setActiveSheet] = useState<SheetType | null>(null);
  const sheetAnim = useRef(new Animated.Value(400)).current;
  const [bagTab, setBagTab] = useState<BagTab>('장신구');
  const [selectedBagItem, setSelectedBagItem] = useState<BagItem | null>(null);
  const [selectedFoundItem, setSelectedFoundItem] = useState<FindableItem | null>(null);
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
  const [deliveredLetterIds, setDeliveredLetterIds] = useState<string[]>([]);
  const [foundItemIds, setFoundItemIds] = useState<string[]>([]);
  const [pendingNewItemId, setPendingNewItemId] = useState<string | null>(null);
  const [hasNewBagItem, setHasNewBagItem] = useState(false);
  const [expandedReadIds, setExpandedReadIds] = useState<ReadonlySet<string>>(new Set());
  const [roomPlacements, setRoomPlacements] = useState<RoomPlacement[]>([]);
  const activeSheetRef = useRef<SheetType | null>(null);
  const pendingRef = useRef<string | null>(null);
  // letters that were unread at the moment the sheet opened — used to show "새 편지" indicator
  const unreadAtOpenRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    Promise.all([
      storageService.load<string[]>(STORAGE_KEYS.MAILBOX_READ_IDS),
      storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS),
      storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID),
      storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS),
      storageService.load<number>(STORAGE_KEYS.LAST_BAG_OPEN_DAYS),
      storageService.load<RoomPlacement[]>(STORAGE_KEYS.ROOM_PLACEMENTS),
    ]).then(([readIdsRaw, foundIds, pending, deliveredIds, lastBagDays, placements]) => {
      if (readIdsRaw) setReadIds(new Set(readIdsRaw));
      if (foundIds) setFoundItemIds(foundIds);
      if (pending != null) {
        pendingRef.current = pending;
        setPendingNewItemId(pending);
      }
      if (deliveredIds) setDeliveredLetterIds(deliveredIds);
      const days = lastBagDays ?? 0;
      if (ALL_BAG_ITEMS.some((item) => item.minDays > days && item.minDays <= recordedDaysCount)) {
        setHasNewBagItem(true);
      }
      if (placements) setRoomPlacements(placements);
    });
  }, []);

  const mailboxUnread = deliveredLetterIds.some((id) => !readIds.has(id));

  const openSheet = useCallback((type: SheetType) => {
    activeSheetRef.current = type;
    setActiveSheet(type);
    if (type === 'bag') {
      setBagTab('장신구');
      setSelectedBagItem(null);
      setSelectedFoundItem(null);
      void storageService.save(STORAGE_KEYS.LAST_BAG_OPEN_DAYS, recordedDaysCount);
      setHasNewBagItem(false);
      // Move pending item into the found collection
      const pendingId = pendingRef.current;
      if (pendingId !== null) {
        setFoundItemIds((prev) => {
          if (prev.includes(pendingId)) return prev;
          const next = [...prev, pendingId];
          storageService.save(STORAGE_KEYS.FOUND_ITEM_IDS, next);
          return next;
        });
      }
    }
    if (type === 'mailbox') {
      unreadAtOpenRef.current = new Set(deliveredLetterIds.filter((id) => !readIds.has(id)));
      if (unreadAtOpenRef.current.size > 0) {
        setReadIds(new Set(deliveredLetterIds));
        storageService.save(STORAGE_KEYS.MAILBOX_READ_IDS, deliveredLetterIds);
      }
    }
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
  }, [sheetAnim, readIds, recordedDaysCount]);

  const toggleLetterExpand = useCallback((id: string) => {
    setExpandedReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const closeSheet = useCallback(() => {
    const closingSheet = activeSheetRef.current;
    Animated.timing(sheetAnim, { toValue: 400, duration: 210, useNativeDriver: true }).start(() => {
      activeSheetRef.current = null;
      setActiveSheet(null);
      setSelectedBagItem(null);
      setSelectedFoundItem(null);
      setExpandedReadIds(new Set());
      if (closingSheet === 'bag' && pendingRef.current !== null) {
        pendingRef.current = null;
        setPendingNewItemId(null);
        storageService.save(STORAGE_KEYS.PENDING_NEW_ITEM_ID, null);
      }
    });
  }, [sheetAnim]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleSobagiTap = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    const pool = getIdleMessages(lastRestAt, new Date());
    let idx = Math.floor(Math.random() * pool.length);
    if (idx === lastIndexRef.current && pool.length > 1) {
      idx = (idx + 1) % pool.length;
    }
    lastIndexRef.current = idx;
    setBubbleMessage(pool[idx] ?? '반가워요 🌿');
    setBubbleVisible(true);

    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
  }, [lastRestAt]);

  return (
    <View style={styles.root}>
      <RoomBackground stage={roomStage} backgroundUri={ROOM_BACKGROUND_URIS[roomStage] ?? ROOM_BACKGROUND_URIS[1]}>
            {timeOfDayTint !== null && (
              <View
                style={[styles.atmosphereOverlay, { backgroundColor: timeOfDayTint.color, opacity: timeOfDayTint.opacity }]}
                pointerEvents="none"
              />
            )}
            <View
              style={[styles.atmosphereOverlay, { backgroundColor: '#E8C070', opacity: warmthOpacity }]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.atmosphereOverlay,
                { backgroundColor: '#E8C070', opacity: getRestWarmthOpacity(new Date(), lastRestAt) },
              ]}
              pointerEvents="none"
            />
            {calmOpacity > 0 && (
              <View
                style={[styles.atmosphereOverlay, { backgroundColor: CALM_OVERLAY_COLOR, opacity: calmOpacity }]}
                pointerEvents="none"
              />
            )}
            <View style={styles.bottomFade} pointerEvents="none">
              <View style={[styles.fadeSlice, { opacity: 0.06 }]} />
              <View style={[styles.fadeSlice, { opacity: 0.18 }]} />
              <View style={[styles.fadeSlice, { opacity: 0.38 }]} />
              <View style={[styles.fadeSlice, { opacity: 0.60 }]} />
              <View style={[styles.fadeSlice, { opacity: 0.82 }]} />
            </View>
            {roomPlacements.map((placement) => {
              const item = ALL_BAG_ITEMS.find((i) => i.id === placement.itemId);
              const slot = ZONE_SLOTS[placement.zone]?.[0];
              if (!item || !slot) return null;
              return (
                <View
                  key={placement.itemId}
                  pointerEvents="none"
                  style={{ position: 'absolute', left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
                >
                  <Text style={styles.roomItemEmoji}>{item.emoji}</Text>
                </View>
              );
            })}
            <RestTV
              position={TV_POSITION}
              adStatus={adState.status}
              effectiveRestsToday={effectiveRestsToday}
              onPress={() => {
                if (effectiveRestsToday >= 2) {
                  setBubbleMessage('오늘은 충분히 쉬었어요 🌿');
                  setBubbleVisible(true);
                  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                  hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3000);
                  return;
                }
                if (adState.status === 'error') {
                  setBubbleMessage('지금은 조용한 채널이 없어요 🌿');
                  setBubbleVisible(true);
                  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                  hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3000);
                  return;
                }
                openSheet('rest');
              }}
            />
            <PebbleJar
              position={JAR_POSITION}
              pebbleCount={pebbleCount}
              onPress={() => {
                setBubbleMessage(`조약돌 ${pebbleCount}개`);
                setBubbleVisible(true);
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 2000);
              }}
            />
            <View style={styles.header}>
              <View style={styles.levelCard}>
                <View style={styles.levelRow}>
                  <Text style={styles.levelText}>Lv.{level} 소박이</Text>
                  <Text style={styles.progressLabel}>함께한 날 {recordedDaysCount} / {nextThreshold}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(Math.round((recordedDaysCount / nextThreshold) * 100), 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.characterArea} onPress={handleSobagiTap} activeOpacity={1}>
              <View style={styles.bubbleContainer} pointerEvents="none">
                <EmotionBubble message={bubbleMessage} visible={bubbleVisible} />
              </View>
              <SobagiCharacter emotion={currentEmotion} size="large" imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />
              <View style={styles.sobagiShadow} />
            </TouchableOpacity>
            <View style={styles.utilityStack}>
              <View style={styles.utilityItem}>
                <Pressable style={styles.utilityBtn} onPress={() => openSheet('bag')}>
                  {({ pressed }) => (
                    <View style={[styles.iconWrap, pressed && styles.iconWrapPressed]}>
                      <Image
                        source={{ uri: UTILITY_ICON_URIS.bag }}
                        style={styles.iconImage}
                        resizeMode="contain"
                      />
                      {(pendingNewItemId !== null || hasNewBagItem) && <View style={styles.utilityDot} />}
                    </View>
                  )}
                </Pressable>
                <Text style={styles.utilityLabel}>가방</Text>
              </View>
              <View style={styles.utilityItem}>
                <Pressable style={styles.utilityBtn} onPress={() => openSheet('mailbox')}>
                  {({ pressed }) => (
                    <View style={[styles.iconWrap, pressed && styles.iconWrapPressed]}>
                      <Image
                        source={{ uri: UTILITY_ICON_URIS.mailbox }}
                        style={styles.iconImage}
                        resizeMode="contain"
                      />
                      {mailboxUnread && <View style={styles.utilityDot} />}
                    </View>
                  )}
                </Pressable>
                <Text style={styles.utilityLabel}>우편함</Text>
              </View>
            </View>
          </RoomBackground>

      <View style={styles.summaryCard}>
        <DailySummary totalAmount={todayTotal} recordCount={todayExpenses.length} />
      </View>

      <BottomTabs activeRoute="/" />

      {activeSheet !== null && (
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet} />
      )}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}
        pointerEvents={activeSheet !== null ? 'auto' : 'none'}
      >
        {activeSheet === 'mailbox' && (
          <View>
            <Text style={styles.sheetTitle}>편지함</Text>
            {deliveredLetterIds.length === 0 ? (
              <Text style={styles.mailboxEmpty}>아직 도착한 편지가 없어요 🌿</Text>
            ) : (
              <ScrollView style={styles.letterScroll} showsVerticalScrollIndicator={false}>
                {[...deliveredLetterIds].reverse().map((id, idx) => {
                  const letter = LETTER_LOOKUP.get(id);
                  if (!letter) return null;
                  const isNew = unreadAtOpenRef.current.has(id);
                  const isExpanded = isNew || expandedReadIds.has(id);
                  const firstLine = letter.body.split('\n')[0] ?? letter.body;
                  const preview = firstLine.length > 38 ? firstLine.slice(0, 38) + '…' : firstLine + '…';
                  return (
                    <Pressable
                      key={id}
                      style={[
                        styles.letterCard,
                        idx > 0 && styles.letterCardSpacing,
                        isNew && styles.letterCardNew,
                        !isExpanded && styles.letterCardCollapsed,
                      ]}
                      onPress={() => { if (!isNew) toggleLetterExpand(id); }}
                    >
                      {isExpanded ? (
                        <>
                          <Text style={styles.letterText}>{letter.body}</Text>
                          <Text style={styles.letterSig}>{letter.sig}</Text>
                        </>
                      ) : (
                        <View style={styles.letterFolded}>
                          <Text style={styles.letterFoldedPreview} numberOfLines={1}>{preview}</Text>
                          <Text style={styles.letterFoldedSig}>{letter.sig}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
        {activeSheet === 'rest' && (
          <RestPrompt
            adStatus={adState.status}
            onConfirm={() => {
              closeSheet();
              adState.show(() => {
                // grantRest reads/writes the store and persists to storage;
                // unlike fire-and-forget saves, a rejection here means the
                // user watched an ad and got nothing. Log instead of dropping.
                grantRest()
                  .then((result) => {
                    // Quiet post-watch line. Shared bubble surface with
                    // Sobagi tap and the daily-done message; just update text.
                    setBubbleMessage(
                      `소박이가 한 숨 돌렸어요 🌿  +${result.pebbleDelta}`,
                    );
                    setBubbleVisible(true);
                    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
                  })
                  .catch((err) => {
                    if (__DEV__) console.error('[grantRest] failed:', err);
                  });
              });
            }}
            onCancel={closeSheet}
          />
        )}
        {activeSheet === 'bag' && (
          <View>
            <Text style={styles.sheetTitle}>소박이의 가방</Text>

            {/* Tab bar */}
            <View style={styles.bagTabBar}>
              {BAG_TABS.map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.bagTabBtn, bagTab === tab && styles.bagTabBtnActive]}
                  onPress={() => { setBagTab(tab); setSelectedBagItem(null); setSelectedFoundItem(null); }}
                >
                  <Text style={[styles.bagTabLabel, bagTab === tab && styles.bagTabLabelActive]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Grid */}
            {BAG_ITEMS[bagTab].length === 0 ? (
              <View style={styles.bagEmptyState}>
                <Text style={styles.bagEmptyText}>
                  {'소박이가 아직 모으지 못했어요\n천천히 채워질 거예요 🌿'}
                </Text>
              </View>
            ) : (
              <View>
                {Array.from({ length: 4 }, (_, row) => (
                  <View key={row} style={styles.bagRow}>
                    {Array.from({ length: 4 }, (_, col) => {
                      const rawItem = BAG_ITEMS[bagTab][row * 4 + col] ?? null;
                      const item = rawItem !== null && recordedDaysCount >= rawItem.minDays ? rawItem : null;
                      const isSelected = item !== null && selectedBagItem?.id === item.id;
                      return (
                        <Pressable
                          key={col}
                          style={[
                            styles.bagCell,
                            item === null && styles.bagCellVacant,
                            isSelected && styles.bagCellSelected,
                          ]}
                          onPress={() => {
                            if (!item) return;
                            setSelectedBagItem(isSelected ? null : item);
                            setSelectedFoundItem(null);
                          }}
                          disabled={item === null}
                        >
                          {item !== null ? (
                            <>
                              <Text style={styles.bagCellEmoji}>{item.emoji}</Text>
                              <Text style={styles.bagCellName}>{item.name}</Text>
                            </>
                          ) : (
                            <View style={styles.bagCellDot} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            {/* Found items section — only when Sobagi has left something */}
            {foundItemIds.length > 0 && (
              <View style={styles.foundSection}>
                <View style={styles.foundDivider} />
                <Text style={styles.foundSectionTitle}>소박이가 두고 간 것</Text>
                <View style={styles.foundChipsRow}>
                  {foundItemIds.map((id) => {
                    const item = FINDABLE_ITEMS.find((f) => f.id === id) ?? null;
                    if (item === null) return null;
                    const isSelected = selectedFoundItem?.id === id;
                    return (
                      <Pressable
                        key={id}
                        style={[styles.foundChip, isSelected && styles.foundChipSelected]}
                        onPress={() => {
                          setSelectedFoundItem(isSelected ? null : item);
                          setSelectedBagItem(null);
                        }}
                      >
                        <Text style={styles.foundChipEmoji}>{item.emoji}</Text>
                        <Text style={styles.foundChipName}>{item.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Description area — shows desc for selected bag item or findLine for found item */}
            <View style={styles.bagDescArea}>
              {(selectedBagItem !== null || selectedFoundItem !== null) && (
                <View style={styles.bagDescCard}>
                  <Text style={styles.bagDescText}>
                    {selectedBagItem?.desc ?? selectedFoundItem?.findLine ?? ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  header: {
    position: 'absolute',
    top: 48,
    left: 16,
  },
  levelCard: {
    backgroundColor: 'rgba(61,48,32,0.42)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 7,
    minWidth: 160,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  characterArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '18%',   // feet at baseboard — matches room floor/wall boundary
    height: 240,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sobagiShadow: {
    width: 64,
    height: 8,
    borderRadius: 32,
    backgroundColor: 'rgba(61,48,32,0.15)',
    alignSelf: 'center',
  },
  bubbleContainer: {
    position: 'absolute',
    bottom: 190,     // character height (180) + gap (10)
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(250,246,238,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.oliveGreen,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: COLORS.card,
  },
  atmosphereOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  fadeSlice: {
    height: 8,
    backgroundColor: COLORS.card,
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 52,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  bagTabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  bagTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  bagTabBtnActive: {
    backgroundColor: COLORS.oliveGreen,
  },
  bagTabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  bagTabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  bagEmptyState: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagEmptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  bagRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 7,
  },
  bagCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  bagCellVacant: {
    opacity: 0.38,
  },
  bagCellSelected: {
    borderWidth: 1.5,
    borderColor: COLORS.oliveGreen,
    backgroundColor: 'rgba(107, 124, 74, 0.07)',
  },
  bagCellDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
  },
  bagCellEmoji: {
    fontSize: 22,
  },
  bagCellName: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 3,
  },
  bagDescArea: {
    height: 68,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  bagDescCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bagDescText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  utilityStack: {
    position: 'absolute',
    top: 118,
    left: 16,
    gap: 0,
  },
  utilityItem: {
    alignItems: 'center',
  },
  utilityLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: -5,
    lineHeight: 14,
  },
  utilityBtn: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    // permanent borderWidth with transparent color — pressed state toggles color only, no layout shift
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrapPressed: {
    borderColor: 'rgba(255,255,255,0.35)',
  },
  iconImage: {
    width: 60,
    height: 60,
  },
  utilityDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  foundSection: {
    marginTop: 14,
  },
  foundDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  foundSectionTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  foundChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  foundChip: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    gap: 2,
    minWidth: 52,
  },
  foundChipSelected: {
    borderWidth: 1,
    borderColor: COLORS.oliveGreen,
    backgroundColor: 'rgba(107, 124, 74, 0.06)',
  },
  foundChipEmoji: {
    fontSize: 18,
  },
  foundChipName: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  mailboxEmpty: {
    fontSize: 13,
    color: COLORS.textMuted,
    paddingVertical: 20,
    textAlign: 'center',
  },
  letterScroll: {
    maxHeight: 420,
  },
  letterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  letterCardSpacing: {
    marginTop: 10,
  },
  letterCardNew: {
    backgroundColor: '#FAF0E2',
  },
  letterCardCollapsed: {
    paddingVertical: 10,
    opacity: 0.6,
  },
  letterFolded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  letterFoldedPreview: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  letterFoldedSig: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    flexShrink: 0,
  },
  letterText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 24,
  },
  letterSig: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  roomItemEmoji: {
    fontSize: 16,
    opacity: 0.60,
  },
});

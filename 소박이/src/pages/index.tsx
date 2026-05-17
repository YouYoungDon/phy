import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
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
import { getLocalDateString } from '../utils/date';
import { COLORS } from '../constants/colors';
import { ROOM_BACKGROUND_URIS, SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS } from '../constants/assets';
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { FINDABLE_ITEMS, FindableItem } from '../constants/findableItems';
import { PERSONAL_LETTERS, ALL_SEASONAL_LETTERS } from '../constants/letters';
import { getTimeOfDayTint, getWarmthOpacity } from '../services/atmosphereService';

export const Route = createRoute('/', {
  validateParams: (params) => params,
  component: HomeScreen,
});

type MailboxLetter = { id: string; body: string; sig: string };

function buildLetterLookup(): Map<string, MailboxLetter> {
  const map = new Map<string, MailboxLetter>();
  for (const l of PERSONAL_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  for (const l of ALL_SEASONAL_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  return map;
}

const LETTER_LOOKUP = buildLetterLookup();

type BagTab = '장신구' | '재료' | '간식' | '장난감';
const BAG_TABS: BagTab[] = ['장신구', '재료', '간식', '장난감'];

type BagItem = { id: string; emoji: string; name: string; desc: string; minDays: number };

const BAG_ITEMS: Record<BagTab, BagItem[]> = {
  장신구: [
    { id: 'a1', emoji: '🌸', name: '꽃잎 핀',    desc: '봄날에 주운 꽃잎이에요. 아직 향이 남아있는 것 같아요.',        minDays: 0  },
    { id: 'a2', emoji: '🌿', name: '잎새 브로치', desc: '창문에 기대다가 발견했어요. 잘 어울려요.',                    minDays: 5  },
    { id: 'a3', emoji: '🌙', name: '달 반지',     desc: '밤에 살짝 반짝이는 작은 반지예요. 소박이가 아끼는 물건이에요.', minDays: 14 },
    { id: 'a4', emoji: '🎀', name: '작은 리본',   desc: '소박이가 아끼는 작은 리본이에요 🌿',                         minDays: 25 },
  ],
  재료: [
    { id: 'm1', emoji: '🍃', name: '찻잎',    desc: '은은한 향이 나요. 차 한 잔 마시면 마음이 편해져요.',  minDays: 0  },
    { id: 'm2', emoji: '🌰', name: '도토리',   desc: '산책하다 주웠어요. 특별한 이유는 없어요.',            minDays: 7  },
    { id: 'm3', emoji: '🍯', name: '꿀병',     desc: '달콤한 꿀이 가득 들어있어요. 가끔 한 숟갈씩 먹어요.', minDays: 18 },
    { id: 'm4', emoji: '🪵', name: '나뭇조각', desc: '결이 부드럽고 따뜻한 나뭇조각이에요.',               minDays: 32 },
  ],
  간식: [
    { id: 's1', emoji: '🍪', name: '버터 쿠키',   desc: '바삭하고 달콤해요. 소박이가 가장 좋아하는 간식이에요.', minDays: 0  },
    { id: 's2', emoji: '🍡', name: '쑥 경단',     desc: '쑥향이 은은하게 나요. 봄에 만든 거예요.',             minDays: 10 },
    { id: 's3', emoji: '☕', name: '따뜻한 커피', desc: '식기 전에 마셔요. 한 모금이면 마음이 따뜻해져요.',    minDays: 20 },
    { id: 's4', emoji: '🍞', name: '작은 빵',     desc: '갓 구운 빵이에요. 아직 따뜻해요.',                   minDays: 35 },
  ],
  장난감: [
    { id: 't1', emoji: '🪀', name: '요요',     desc: '잘 못 하는데 그냥 갖고 있어요.',                               minDays: 3  },
    { id: 't2', emoji: '🎈', name: '작은 풍선', desc: '언제 들고 온 건지 모르겠지만, 아직 팡 안 터졌어요.',            minDays: 12 },
    { id: 't3', emoji: '🌀', name: '팽이',     desc: '조용히 돌아가는 걸 보고 있으면 마음이 고요해져요.',              minDays: 22 },
    { id: 't4', emoji: '🧸', name: '작은 곰',  desc: '오래된 곰 인형이에요. 낡았지만 소박이가 아껴요.',               minDays: 40 },
  ],
};

const ALL_BAG_ITEMS = Object.values(BAG_ITEMS).flat();

const IDLE_MESSAGES = [
  '반가워요 🌿',
  '오늘 하루는 어땠어요?',
  '차 한잔 하고 싶어요 ☕',
  '여기 있을게요',
  '천천히 해요',
  '오늘도 수고했어요',
  '조용히 있어도 괜찮아요',
  '뭔가 마실까요? 🍵',
  '같이 있을게요',
  '무슨 생각 하고 있어요?',
  '바람이 살랑이네요 🌸',
  '오늘 기분은 어때요?',
];

function HomeScreen() {
  useAppInit();

  const currentEmotion = useEmotionStore((s) => s.currentEmotion);
  const roomStage = useUserStore((s) => s.roomStage);
  const level = useUserStore((s) => s.level);
  const recordedDaysCount = useUserStore((s) => s.recordedDaysCount);
  const nextThreshold = getNextThreshold(recordedDaysCount);
  const expenses = useExpenseStore((s) => s.expenses);
  const timeOfDayTint = getTimeOfDayTint(new Date().getHours());
  const warmthOpacity = getWarmthOpacity(recordedDaysCount);

  const todayExpenses = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return expenses.filter((e) => getLocalDateString(new Date(e.createdAt)) === todayStr);
  }, [expenses]);

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState('');
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndexRef = useRef(-1);

  type SheetType = 'mailbox' | 'bag';
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
    ]).then(([readIdsRaw, foundIds, pending, deliveredIds, lastBagDays]) => {
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

    let idx = Math.floor(Math.random() * IDLE_MESSAGES.length);
    if (idx === lastIndexRef.current && IDLE_MESSAGES.length > 1) {
      idx = (idx + 1) % IDLE_MESSAGES.length;
    }
    lastIndexRef.current = idx;
    setBubbleMessage(IDLE_MESSAGES[idx] ?? '반가워요 🌿');
    setBubbleVisible(true);

    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
  }, []);

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
        <View style={styles.bottomFade} pointerEvents="none">
          <View style={[styles.fadeSlice, { opacity: 0.06 }]} />
          <View style={[styles.fadeSlice, { opacity: 0.18 }]} />
          <View style={[styles.fadeSlice, { opacity: 0.38 }]} />
          <View style={[styles.fadeSlice, { opacity: 0.60 }]} />
          <View style={[styles.fadeSlice, { opacity: 0.82 }]} />
        </View>
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
        <TouchableOpacity style={styles.propMailbox} onPress={() => openSheet('mailbox')} activeOpacity={0.7}>
          <Text style={styles.propIconMailbox}>📬</Text>
          {mailboxUnread && (
            <View style={styles.propBadge}>
              <Text style={styles.propBadgeText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.propBag} onPress={() => openSheet('bag')} activeOpacity={0.7}>
          <Text style={styles.propIconBag}>🎒</Text>
          <View style={styles.propBagShadow} />
          {(pendingNewItemId !== null || hasNewBagItem) && <View style={styles.bagDot} />}
        </TouchableOpacity>
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
  propMailbox: {
    position: 'absolute',
    top: '28%',
    right: 20,
    padding: 8,
  },
  propBag: {
    position: 'absolute',
    top: '58%',
    left: 18,
    padding: 8,
  },
  propIconMailbox: {
    fontSize: 26,
    opacity: 0.76,
  },
  propIconBag: {
    fontSize: 30,
    opacity: 0.90,
  },
  propBagShadow: {
    width: 20,
    height: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(61,48,32,0.10)',
    alignSelf: 'center',
    marginTop: -2,
  },
  propBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#C96A45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 11,
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
  bagDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9A87C',
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
});

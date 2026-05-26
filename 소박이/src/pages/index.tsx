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
import { getLocalDateString, expenseLocalDate } from '../utils/date';
import { COLORS } from '../constants/colors';
import { ROOM_TIME_BACKGROUND_URIS, SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS, UTILITY_ICON_URIS, ROOM_FURNITURE_URIS } from '../constants/assets';
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { FINDABLE_ITEMS } from '../constants/findableItems';
import { PERSONAL_LETTERS, ALL_SEASONAL_LETTERS } from '../constants/letters';
import { REST_LETTERS } from '../constants/restLetters';
import { getTimeOfDayBackgroundKey, getWarmthOpacity, getCalmAtmosphereOpacity, CALM_OVERLAY_COLOR, getRestWarmthOpacity } from '../services/atmosphereService';
import { ALL_BAG_ITEMS } from '../constants/bagItems';
import { DiscoverableItem } from '../components/room/DiscoverableItem';
import { RestPrompt } from '../components/room/RestPrompt';
import { useRestedAd } from '../hooks/useRestedAd';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { getEffectiveRestsToday, grantRest } from '../services/restService';
import { getPrevVisitDate } from '../hooks/useAppInit';
import { selectAmbientLine, AmbientContext, AmbientSession } from '../services/ambientDialogueService';
import { keepsakeLineFor, pickupLineFor, trinketCounts } from '../services/discoveryService';
import { splitMailbox } from '../services/letterService';
import { useDiscoveryStore } from '../store/discoveryStore';
import { RECENT_RING_SIZE } from '../constants/ambientDialogue';

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


// Whole calendar days between two YYYY-MM-DD strings (noon-anchored, DST-safe).
function calendarDaysBetween(laterYmd: string, earlierYmd: string): number {
  const a = Date.parse(laterYmd + 'T12:00:00');
  const b = Date.parse(earlierYmd + 'T12:00:00');
  return Math.round((a - b) / 86_400_000);
}

function HomeScreen() {
  const currentEmotion = useEmotionStore((s) => s.currentEmotion);
  const roomStage = useUserStore((s) => s.roomStage);
  const level = useUserStore((s) => s.level);
  const recordedDaysCount = useUserStore((s) => s.recordedDaysCount);
  const streak = useUserStore((s) => s.streak);
  const nextThreshold = getNextThreshold(recordedDaysCount);
  const expenses = useExpenseStore((s) => s.expenses);
  const restsToday = useUserStore((s) => s.restsToday);
  const lastRestDate = useUserStore((s) => s.lastRestDate);
  const lastRestAt = useUserStore((s) => s.lastRestAt);
  const adState = useRestedAd();
  const todayStr = getLocalDateString(new Date());
  const effectiveRestsToday = getEffectiveRestsToday(restsToday, lastRestDate, todayStr);
  const timeBackgroundUri = ROOM_TIME_BACKGROUND_URIS[getTimeOfDayBackgroundKey(new Date().getHours())];
  const warmthOpacity = getWarmthOpacity(recordedDaysCount);
  const calmOpacity = getCalmAtmosphereOpacity(expenses, getLocalDateString(new Date()));

  const todayExpenses = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return expenses.filter((e) => expenseLocalDate(e) === todayStr);
  }, [expenses]);

  // Spending only — income records and no-spend markers aren't spending, so
  // they don't count toward the day's total and don't surface an amount row.
  const todaySpendingRecords = todayExpenses.filter(
    (e) => e.kind !== 'income' && e.category !== 'no_spend',
  );
  const todayTotal = todaySpendingRecords.reduce((sum, e) => sum + e.amount, 0);

  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState('');
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambientSessionRef = useRef<AmbientSession>({ recentIds: [], returnGreetingShown: false, lastWasSilence: false });
  const tapPulse = useRef(new Animated.Value(1)).current;

  type SheetType = 'mailbox' | 'bag' | 'rest';
  const [activeSheet, setActiveSheet] = useState<SheetType | null>(null);
  const sheetAnim = useRef(new Animated.Value(400)).current;
  const [selectedKeptId, setSelectedKeptId] = useState<string | null>(null);
  const [keptMomentLine, setKeptMomentLine] = useState<string>('');
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
  const [deliveredLetterIds, setDeliveredLetterIds] = useState<string[]>([]);
  const [foundItemIds, setFoundItemIds] = useState<string[]>([]);
  const [expandedReadIds, setExpandedReadIds] = useState<ReadonlySet<string>>(new Set());
  // Whether the 지난 편지 drawer is expanded. Render-only; resets when the sheet closes.
  const [archiveOpen, setArchiveOpen] = useState(false);
  // Discovery truth lives in the store (hydrated by useAppInit after migration +
  // arrival compute), so Home reads the same post-arrival state reactively
  // instead of racing useAppInit's storage write with its own mount-time read.
  const discoveryQueue = useDiscoveryStore((s) => s.queue);
  const keptItemIds = useDiscoveryStore((s) => s.kept);
  const keepDiscovery = useDiscoveryStore((s) => s.keep);
  // The keepsake grid shows everything kept. Found trinkets still arrive via the
  // legacy "두고 간 것" path (into foundItemIds); merge them in so they show as
  // keepsakes too. (Unifying trinket acquisition into the discovery queue is a
  // follow-up.)
  const displayedKeptIds = useMemo(
    () => Array.from(new Set([...keptItemIds, ...foundItemIds])),
    [keptItemIds, foundItemIds],
  );

  // Per-id occurrence counts for found trinkets; catalog ids resolve to 1 via `?? 1`.
  const keepsakeCounts = useMemo(() => trinketCounts(foundItemIds), [foundItemIds]);
  const activeSheetRef = useRef<SheetType | null>(null);
  const pendingRef = useRef<string | null>(null);
  // letters that were unread at the moment the sheet opened — used to show "새 편지" indicator
  const unreadAtOpenRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    // Discovery queue/kept come from the store (hydrated by useAppInit); Home
    // only loads its own local surfaces here: mailbox state, found trinkets, and
    // any pending trinket awaiting promotion on next bag open.
    Promise.all([
      storageService.load<string[]>(STORAGE_KEYS.MAILBOX_READ_IDS),
      storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS),
      storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID),
      storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS),
    ]).then(([readIdsRaw, foundIds, pending, deliveredIds]) => {
      if (readIdsRaw) setReadIds(new Set(readIdsRaw));
      if (foundIds) setFoundItemIds(foundIds);
      if (pending != null) pendingRef.current = pending;
      if (deliveredIds) setDeliveredLetterIds(deliveredIds);
    });
  }, []);

  const mailboxUnread = deliveredLetterIds.some((id) => !readIds.has(id));

  const openSheet = useCallback((type: SheetType) => {
    activeSheetRef.current = type;
    setActiveSheet(type);
    if (type === 'bag') {
      setSelectedKeptId(null);
      // Promote a pending found trinket into the keepsake collection AND clear the
      // pending marker atomically on open — so a kill before close can't leave a
      // stale PENDING_NEW_ITEM_ID pointing at an item that's already been kept.
      const pendingId = pendingRef.current;
      if (pendingId !== null) {
        pendingRef.current = null;
        void storageService.save(STORAGE_KEYS.PENDING_NEW_ITEM_ID, null);
        setFoundItemIds((prev) => {
          // Always append — a re-found trinket adds another copy (its ×N trace).
          // FOUND_ITEM_IDS is a multiset; tiles still group by id at render.
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
  }, [sheetAnim, readIds, deliveredLetterIds]);

  const toggleLetterExpand = useCallback((id: string) => {
    setExpandedReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const closeSheet = useCallback(() => {
    Animated.timing(sheetAnim, { toValue: 400, duration: 210, useNativeDriver: true }).start(() => {
      activeSheetRef.current = null;
      setActiveSheet(null);
      setSelectedKeptId(null);
      setExpandedReadIds(new Set());
      setArchiveOpen(false);
    });
  }, [sheetAnim]);

  // Android hardware back closes an open overlay before falling through to
  // navigation. A selected bag/found item collapses back to the grid first;
  // otherwise the whole sheet closes. No-op when nothing is open (and on iOS).
  const handleAndroidBack = useCallback(() => {
    if (selectedKeptId !== null) {
      setSelectedKeptId(null);
      return;
    }
    if (activeSheet !== null) closeSheet();
  }, [selectedKeptId, activeSheet, closeSheet]);
  useAndroidBack(activeSheet !== null, handleAndroidBack);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const playTapPulse = useCallback(() => {
    tapPulse.setValue(1);
    Animated.sequence([
      Animated.timing(tapPulse, { toValue: 1.06, duration: 90, useNativeDriver: true }),
      Animated.spring(tapPulse, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 140 }),
    ]).start();
  }, [tapPulse]);

  const handleSobagiTap = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    playTapPulse(); // every tap is acknowledged — especially silent ones

    const now = new Date();
    const prev = getPrevVisitDate();
    const ctx: AmbientContext = {
      timeBucket: getTimeOfDayBackgroundKey(now.getHours()),
      recordedDaysCount,
      streak,
      isNoSpendToday: todayExpenses.length > 0 && todayTotal === 0,
      placedItemIds: keptItemIds, // objects now live in the bag (kept), not the room
      daysSinceLastVisit: prev ? calendarDaysBetween(getLocalDateString(now), prev) : 0,
      calmActive: calmOpacity > 0,
      restActive: getRestWarmthOpacity(now, lastRestAt) > 0,
    };

    const session = ambientSessionRef.current;
    const sel = selectAmbientLine(ctx, session, Math.random);

    if (sel.kind === 'silence') {
      session.lastWasSilence = true;
      setBubbleVisible(false); // quiet — the tap pulse is the only acknowledgment
      return;
    }

    session.recentIds = [...session.recentIds, sel.line.id].slice(-RECENT_RING_SIZE);
    if (sel.isReturnGreeting) session.returnGreetingShown = true;
    session.lastCategory = sel.category;
    session.lastWasSilence = false;

    setBubbleMessage(sel.line.text);
    setBubbleVisible(true);
    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
  }, [recordedDaysCount, streak, todayExpenses, todayTotal, keptItemIds, calmOpacity, lastRestAt, playTapPulse]);

  // Pick up the item the user found in the room: move it from the discovery
  // queue into the kept bag, persist both, and say a soft line. (Animation: stage 5.)
  const handlePickUp = useCallback((itemId: string) => {
    keepDiscovery(itemId); // store action: move queue front → kept + write through to storage

    // Item-specific quiet line (its own note, or a trinket's find line) — picking
    // up reads as noticing & keeping, not a generic acquisition toast.
    const line = pickupLineFor(itemId);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setBubbleMessage(line);
    setBubbleVisible(true);
    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3000);
  }, [keepDiscovery]);

  return (
    <View style={styles.root}>
      <RoomBackground stage={roomStage} backgroundUri={timeBackgroundUri}>
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
              <Animated.View style={{ transform: [{ scale: tapPulse }] }}>
                <SobagiCharacter emotion={currentEmotion} size="large" imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />
              </Animated.View>
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
              <View style={styles.utilityItem}>
                <Pressable
                  style={styles.utilityBtn}
                  onPress={() => {
                    if (effectiveRestsToday >= 2) {
                      setBubbleMessage('오늘은 충분히 쉬었어요 🌿');
                      setBubbleVisible(true);
                      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                      hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3000);
                      return;
                    }
                    if (adState.status === 'unsupported') {
                      setBubbleMessage('아직 준비 중이에요 🌿');
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
                >
                  {({ pressed }) => (
                    <View style={[styles.iconWrap, pressed && styles.iconWrapPressed]}>
                      <Image
                        source={{ uri: ROOM_FURNITURE_URIS.tv }}
                        style={styles.iconImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </Pressable>
                <Text style={styles.utilityLabel}>티비</Text>
              </View>
            </View>
            {(() => {
              // One gentle arrival at a time — the queue front, waiting to be
              // found on the right side of the floor (the jar sits opposite, on
              // the left, with Sobagi centered between them). Rendered last so it
              // layers above the full-width character touch zone — otherwise the
              // character's tap area, which on small screens covers most of the
              // floor, would swallow the pickup tap.
              const frontId = discoveryQueue[0];
              if (frontId == null) return null;
              const item =
                ALL_BAG_ITEMS.find((i) => i.id === frontId) ??
                FINDABLE_ITEMS.find((f) => f.id === frontId);
              if (!item) return null;
              return <DiscoverableItem emoji={item.emoji} onPress={() => handlePickUp(frontId)} />;
            })()}
          </RoomBackground>

      <View style={styles.summaryCard}>
        <DailySummary
          totalAmount={todayTotal}
          recordCount={todayExpenses.length}
          spendingCount={todaySpendingRecords.length}
        />
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
            ) : (() => {
              const { currentIds, archivedIds } = splitMailbox(
                deliveredLetterIds,
                new Set(unreadAtOpenRef.current),
              );
              return (
                <ScrollView style={styles.letterScroll} showsVerticalScrollIndicator={false}>
                  {/* 현재 — the letter(s) on the table, always open. */}
                  {currentIds.map((id, idx) => {
                    const letter = LETTER_LOOKUP.get(id);
                    if (!letter) return null;
                    const isNew = unreadAtOpenRef.current.has(id);
                    return (
                      <View
                        key={id}
                        style={[
                          styles.letterCard,
                          idx > 0 && styles.letterCardSpacing,
                          isNew && styles.letterCardNew,
                        ]}
                      >
                        <Text style={styles.letterText}>{letter.body}</Text>
                        <Text style={styles.letterSig}>{letter.sig}</Text>
                      </View>
                    );
                  })}

                  {/* 지난 편지 — quietly folded; tap the header to look back. */}
                  {archivedIds.length > 0 && (
                    <>
                      <Pressable
                        style={styles.letterArchiveHeader}
                        onPress={() => setArchiveOpen((v) => !v)}
                      >
                        <Text style={styles.letterArchiveTitle}>지난 편지</Text>
                        <Text style={styles.letterArchiveChevron}>{archiveOpen ? '▾' : '▸'}</Text>
                      </Pressable>
                      {archiveOpen &&
                        archivedIds.map((id) => {
                          const letter = LETTER_LOOKUP.get(id);
                          if (!letter) return null;
                          const isExpanded = expandedReadIds.has(id);
                          const firstLine = letter.body.split('\n')[0] ?? letter.body;
                          const preview =
                            firstLine.length > 38 ? firstLine.slice(0, 38) + '…' : firstLine + '…';
                          return (
                            <Pressable
                              key={id}
                              style={[
                                styles.letterCard,
                                styles.letterCardSpacing,
                                !isExpanded && styles.letterCardCollapsed,
                              ]}
                              onPress={() => toggleLetterExpand(id)}
                            >
                              {isExpanded ? (
                                <>
                                  <Text style={styles.letterText}>{letter.body}</Text>
                                  <Text style={styles.letterSig}>{letter.sig}</Text>
                                </>
                              ) : (
                                <View style={styles.letterFolded}>
                                  <Text style={styles.letterFoldedPreview} numberOfLines={1}>
                                    {preview}
                                  </Text>
                                  <Text style={styles.letterFoldedSig}>{letter.sig}</Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                    </>
                  )}
                </ScrollView>
              );
            })()}
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

            {/* Keepsake grid — only the things you've discovered & kept. */}
            {displayedKeptIds.length === 0 ? (
              <View style={styles.bagEmptyState}>
                <Text style={styles.bagEmptyText}>
                  {'아직 간직한 게 없어요\n천천히 모일 거예요 🌿'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.bagScroll} showsVerticalScrollIndicator={false}>
                {Array.from({ length: Math.ceil(displayedKeptIds.length / 4) }, (_, row) => {
                  const rowIds = displayedKeptIds.slice(row * 4, row * 4 + 4);
                  return (
                    <View key={row} style={styles.bagRow}>
                      {rowIds.map((id) => {
                        const item =
                          ALL_BAG_ITEMS.find((i) => i.id === id) ??
                          FINDABLE_ITEMS.find((f) => f.id === id);
                        if (!item) return <View key={id} style={styles.bagCellSpacer} />;
                        const isSelected = selectedKeptId === id;
                        return (
                          <Pressable
                            key={id}
                            style={[styles.bagCell, isSelected && styles.bagCellSelected]}
                            onPress={() => {
                              if (isSelected) { setSelectedKeptId(null); return; }
                              setSelectedKeptId(id);
                              setKeptMomentLine(keepsakeLineFor(id));
                            }}
                          >
                            <Text style={styles.bagCellEmoji}>{item.emoji}</Text>
                            <Text style={styles.bagCellName}>{item.name}</Text>
                            {(keepsakeCounts[id] ?? 1) >= 2 && (
                              <Text style={styles.bagCellCount}>×{keepsakeCounts[id]}</Text>
                            )}
                          </Pressable>
                        );
                      })}
                      {Array.from({ length: 4 - rowIds.length }, (_, i) => (
                        <View key={`pad-${i}`} style={styles.bagCellSpacer} />
                      ))}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* The kept item's quiet moment — Sobagi's note about it, resolved on tap. */}
            <View style={styles.bagDescArea}>
              {selectedKeptId !== null && keptMomentLine !== '' && (
                <View style={styles.bagDescCard}>
                  <Text style={styles.bagDescText}>{keptMomentLine}</Text>
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
  // Bounded so the keepsake grid scrolls as kept accumulates instead of pushing
  // the sheet (and the desc card below it) off-screen.
  bagScroll: {
    maxHeight: 360,
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
  // Invisible filler to keep the last keepsake row aligned to 4 columns.
  bagCellSpacer: {
    flex: 1,
    aspectRatio: 1,
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
  // Quiet "turned up again" trace in the cell corner. Softer than the name (textLight,
  // not textMuted), no background pill — a trace, never a badge. Shown only at ×2+.
  bagCellCount: {
    position: 'absolute',
    right: 6,
    bottom: 5,
    fontSize: 11,
    color: COLORS.textLight,
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
    // Soft contrast aid so the light labels stay legible over bright morning/
    // afternoon background paintings — calm and near-invisible, not a glow.
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  // 지난 편지 drawer header — a quiet, tappable row. No background pill, no count;
  // muted text + a small chevron, so looking back never reads as an inbox folder.
  letterArchiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  letterArchiveTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  letterArchiveChevron: {
    fontSize: 12,
    color: COLORS.textLight,
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

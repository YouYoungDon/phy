import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, TextInput, Keyboard, Platform } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { Expense, ExpenseCategory } from '../types';
import { COLORS } from '../constants/colors';
import { getLocalDateString } from '../utils/date';
import { BottomTabs } from '../components/common/BottomTabs';
import { PhotocardView, PhotocardRecord } from '../components/photocard/PhotocardView';
import { getDayFeeling } from '../services/dayFeelingService';
import { updateExpense as persistUpdateExpense, deleteExpense as persistDeleteExpense } from '../services/expenseService';
import { GENERAL_SPENDING_CATEGORIES, INCOME_CATEGORIES, kindForCategory, formatCategoryWithEmoji, formatCategoryLabel, CATEGORY_BY_TOKEN } from '../constants/categories';
import { selectStatsObservation } from '../services/statsObservationService';
import { MonthPresenceRow } from '../components/stats/MonthPresenceRow';

export const Route = createRoute('/stats', {
  validateParams: (params) => params,
  component: StatsScreen,
});

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_LABELS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ─── Day expense list ─────────────────────────────────────────────────────────

function ExpenseList({ expenses, onPress }: { expenses: Expense[]; onPress?: (expense: Expense) => void }) {
  if (expenses.length === 0) return null;
  return (
    <View style={styles.expenseList}>
      {expenses.map((e, idx) => (
        <Pressable key={e.id} onPress={() => onPress?.(e)}>
          {idx > 0 && <View style={styles.recordDivider} />}
          <View style={styles.recordRow}>
            <Text style={styles.recordCategory}>{formatCategoryWithEmoji(e.category)}</Text>
            <View style={styles.recordRight}>
              {e.userEmotion ? (
                <Text style={styles.recordEmotion}>{e.userEmotion}</Text>
              ) : null}
              <Text style={styles.recordAmount}>{e.amount.toLocaleString()}원</Text>
              {onPress && <Text style={styles.recordChevron}>›</Text>}
            </View>
          </View>
          {e.memo ? (
            <Text style={styles.recordMemo}>{e.memo}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

function StatsScreen() {
  const expenses = useExpenseStore((s) => s.expenses);
  const streak = useUserStore((s) => s.streak);

  const today = new Date();
  const todayStr = getLocalDateString(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const [showDayPhotocard, setShowDayPhotocard] = useState(false);

  // Month picker — separate "pickerYear" state so the user can browse years
  // inside the modal without committing until they tap a month. Reset to
  // viewYear every time the picker opens.
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  const dayRevealAnim = useRef(new Animated.Value(1)).current;

  const expensesByDate = useMemo(() => {
    const map: Record<string, { total: number; count: number; categories: ExpenseCategory[] }> = {};
    for (const e of expenses) {
      if (e.kind === 'income') continue;
      const d = getLocalDateString(new Date(e.createdAt));
      if (!map[d]) map[d] = { total: 0, count: 0, categories: [] };
      map[d].total += e.amount;
      map[d].count += 1;
      map[d].categories.push(e.category);
    }
    return map;
  }, [expenses]);

  const selectedExpenses = useMemo(
    () => expenses.filter((e) => getLocalDateString(new Date(e.createdAt)) === selectedDay),
    [expenses, selectedDay],
  );

  // No-spend records carry amount 0; they exist for streak/day-count/found-item
  // purposes but are not "spending" and shouldn't surface in the spending list,
  // top-category, or dayFeeling derivations. Calendar totals are unaffected
  // because no-spend amount is 0.
  const selectedSpendingExpenses = useMemo(
    () => selectedExpenses.filter((e) => e.category !== 'no_spend' && e.kind !== 'income'),
    [selectedExpenses],
  );

  const selectedIncomeExpenses = useMemo(
    () => selectedExpenses.filter((e) => e.kind === 'income'),
    [selectedExpenses],
  );

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);

  const calendarWeeks: (number | null)[][] = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [viewYear, viewMonth, daysInMonth, firstDow]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    const isCurrent = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    if (isCurrent) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Month-picker handlers — kept inline because they're tightly coupled to
  // viewYear/viewMonth/selectedDay state and don't need to be reused.
  const openMonthPicker = useCallback(() => {
    setPickerYear(viewYear);
    setShowMonthPicker(true);
  }, [viewYear]);
  const closeMonthPicker = useCallback(() => {
    setShowMonthPicker(false);
  }, []);
  const pickerPrevYear = useCallback(() => {
    setPickerYear(y => y - 1);
  }, []);
  const pickerNextYear = useCallback(() => {
    setPickerYear(y => Math.min(y + 1, today.getFullYear()));
  }, [today]);
  // Commit a month selection: jump the calendar and adjust selectedDay safely.
  // If the previously selected day already lives in the new month, keep it.
  // Otherwise prefer today (when today falls in the new month) else the 1st.
  const selectMonth = useCallback((y: number, m: number) => {
    const newPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
    setViewYear(y);
    setViewMonth(m);
    if (!selectedDay.startsWith(newPrefix)) {
      const todayPrefix = todayStr.slice(0, 7);
      if (todayPrefix === newPrefix) {
        setSelectedDay(todayStr);
      } else {
        setSelectedDay(`${newPrefix}-01`);
      }
    }
    setShowMonthPicker(false);
  }, [selectedDay, todayStr]);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`;

  const selectedData = expensesByDate[selectedDay] ?? null;
  const selectedDt = new Date(selectedDay + 'T00:00:00');
  const selectedLabel = `${selectedDt.getMonth() + 1}월 ${selectedDt.getDate()}일`;

  const topCategoryThisMonth = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const counts: Partial<Record<ExpenseCategory, number>> = {};
    for (const e of expenses) {
      if (e.category === 'no_spend') continue;
      if (e.kind === 'income') continue;
      if (!getLocalDateString(new Date(e.createdAt)).startsWith(prefix)) continue;
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
    return (Object.entries(counts) as [ExpenseCategory, number][])
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  }, [expenses, viewYear, viewMonth]);

  // Distinct local-date days with ANY record (spending OR no-spend) in the
  // current calendar week (Sun–Sat) anchored on `today`.
  const weekVisitDays = useMemo(() => {
    const t = new Date(todayStr + 'T12:00:00');
    const weekStart = new Date(t);
    weekStart.setDate(t.getDate() - t.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday
    const startStr = getLocalDateString(weekStart);
    const endStr = getLocalDateString(weekEnd);
    const days = new Set<string>();
    for (const e of expenses) {
      const d = getLocalDateString(new Date(e.createdAt));
      if (d >= startStr && d <= endStr) days.add(d);
    }
    return days.size;
  }, [expenses, todayStr]);

  // Distinct local-date days with ANY record in the current view month.
  const monthVisitDays = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const days = new Set<string>();
    for (const e of expenses) {
      const d = getLocalDateString(new Date(e.createdAt));
      if (d.startsWith(prefix)) days.add(d);
    }
    return days.size;
  }, [expenses, viewYear, viewMonth]);

  const cadenceLines: string[] = useMemo(() => {
    if (monthVisitDays === 0) {
      return ['이번 달은 아직 비어있어요 🌿'];
    }
    if (weekVisitDays === 0) {
      return [
        '이번 주는 아직 비어있어요 🌿',
        `이번 달은 ${monthVisitDays}일 다녀갔어요`,
      ];
    }
    return [
      `이번 주엔 ${weekVisitDays}번 들렀어요`,
      `이번 달은 ${monthVisitDays}일 다녀갔어요`,
    ];
  }, [weekVisitDays, monthVisitDays]);

  const observation = useMemo(
    () => selectStatsObservation(expenses, streak, todayStr),
    [expenses, streak, todayStr],
  );

  // Photocard data — derived from the selected day's spending records only.
  // A no-spend-only day has no spending feeling to surface.
  const dayFeeling = useMemo(
    () => selectedSpendingExpenses.length > 0 ? getDayFeeling(selectedSpendingExpenses, selectedDay) : null,
    [selectedSpendingExpenses, selectedDay],
  );

  // Photocard renders only real spending records. No-spend entries exist for
  // streak/day-count but never appear as "₩ 0 — 무지출" lines on the card.
  const photocardRecords: PhotocardRecord[] = useMemo(
    () => selectedSpendingExpenses.map((e) => ({
      id: e.id,
      category: e.category,
      categoryLabel: formatCategoryLabel(e.category),
      amount: e.amount,
      memo: e.memo,
      kind: e.kind,
    })),
    [selectedSpendingExpenses],
  );

  const photocardDateStr = useMemo(() => {
    const d = new Date(selectedDay + 'T00:00:00');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  }, [selectedDay]);

  const photocardWeekday = useMemo(() => {
    const d = new Date(selectedDay + 'T00:00:00');
    return WEEKDAY_LABELS[d.getDay()];
  }, [selectedDay]);

  const openDayPhotocard = useCallback(() => {
    dayRevealAnim.setValue(1);
    setShowDayPhotocard(true);
    requestAnimationFrame(() => {
      Animated.timing(dayRevealAnim, {
        toValue: 0,
        duration: 1800,
        useNativeDriver: true,
      }).start();
    });
  }, [dayRevealAnim]);

  const closeDayPhotocard = useCallback(() => {
    setShowDayPhotocard(false);
  }, []);

  // ─── Edit sheet state ────────────────────────────────────────────────────────

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('cafe');
  const [editMemo, setEditMemo] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editSheetBottom, setEditSheetBottom] = useState(0);
  const editSheetAnim = useRef(new Animated.Value(500)).current;

  const editingExpensePool = useMemo(() => {
    if (!editingExpense) return GENERAL_SPENDING_CATEGORIES;
    return editingExpense.kind === 'income' ? INCOME_CATEGORIES : GENERAL_SPENDING_CATEGORIES;
  }, [editingExpense]);

  useEffect(() => {
    if (editingExpense === null) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setEditSheetBottom(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setEditSheetBottom(0));
    return () => { show.remove(); hide.remove(); };
  }, [editingExpense]);

  const openEdit = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category);
    setEditMemo(expense.memo ?? '');
    setDeleteConfirm(false);
    Animated.spring(editSheetAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
  }, [editSheetAnim]);

  const closeEdit = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(editSheetAnim, { toValue: 500, duration: 210, useNativeDriver: true }).start(() => {
      setEditingExpense(null);
      setDeleteConfirm(false);
      setEditSheetBottom(0);
    });
  }, [editSheetAnim]);

  const commitEdit = useCallback(() => {
    if (!editingExpense) return;
    const parsed = parseInt(editAmount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed) || parsed <= 0) return;
    persistUpdateExpense(editingExpense.id, {
      amount: parsed,
      category: editCategory,
      memo: editMemo.trim() || undefined,
      kind: kindForCategory(editCategory),
    });
    closeEdit();
  }, [editingExpense, editAmount, editCategory, editMemo, closeEdit]);

  const commitDelete = useCallback(() => {
    if (!editingExpense) return;
    persistDeleteExpense(editingExpense.id);
    closeEdit();
  }, [editingExpense, closeEdit]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>소소한 기록</Text>
        <Text style={styles.headerSub}>이번 달을 조용히 돌아봐요</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Calendar */}
        <View style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <Pressable onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </Pressable>
            <Pressable onPress={openMonthPicker} style={styles.monthLabelBtn} hitSlop={8}>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
            </Pressable>
            <Pressable onPress={nextMonth} style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}>
              <Text style={[styles.navArrow, isCurrentMonth && styles.navArrowDisabled]}>›</Text>
            </Pressable>
          </View>

          <View style={styles.dowRow}>
            {DAY_LABELS.map((d, i) => (
              <Text key={d} style={[styles.dowLabel, i === 0 && styles.dowSun, i === 6 && styles.dowSat]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarWeeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (day == null) return <View key={`e-${wi}-${di}`} style={styles.cell} />;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const data = expensesByDate[dateStr];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDay;
                  const isFuture = dateStr > todayStr;
                  return (
                    <Pressable
                      key={dateStr}
                      style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
                      onPress={() => !isFuture && setSelectedDay(dateStr)}
                    >
                      <Text style={[
                        styles.dayNum,
                        isToday && !isSelected && styles.dayNumToday,
                        isFuture && styles.dayNumFuture,
                        isSelected && styles.dayNumSelected,
                        !isSelected && di === 0 && styles.daySun,
                        !isSelected && di === 6 && styles.daySat,
                      ]}>
                        {day}
                      </Text>
                      {data ? (
                        data.total === 0 ? (
                          // No-spend-only day: render a quiet leaf instead of "0".
                          // Same slot/size as the amount text, just a different glyph,
                          // so the calendar layout stays untouched.
                          <Text style={[styles.dayAmount, isSelected && styles.dayAmountSelected]}>
                            🌿
                          </Text>
                        ) : (
                          <Text style={[styles.dayAmount, isSelected && styles.dayAmountSelected]}>
                            {data.total.toLocaleString('ko-KR')}
                          </Text>
                        )
                      ) : (
                        <View style={styles.dayAmountPlaceholder} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Selected day card — renders when the day has any record (spending or income).
            No-spend-only days still don't surface a card (they're calendar-only). */}
        {(selectedSpendingExpenses.length > 0 || selectedIncomeExpenses.length > 0) && (
          <View style={styles.dayCard}>
            <View style={styles.dayCardHeader}>
              <Text style={styles.dayCardTitle}>{selectedLabel}</Text>
              {selectedSpendingExpenses.length > 0 && (
                <Text style={styles.dayCardTotal}>{selectedData?.total.toLocaleString()}원</Text>
              )}
            </View>
            {selectedSpendingExpenses.length > 0 && (
              <ExpenseList expenses={selectedSpendingExpenses} onPress={openEdit} />
            )}
            {selectedIncomeExpenses.length > 0 && (
              <View
                style={[
                  styles.incomeSection,
                  selectedSpendingExpenses.length === 0 && styles.incomeSectionStandalone,
                ]}
              >
                <Text style={styles.incomeSectionTitle}>들어온 기록</Text>
                {selectedIncomeExpenses.map((r) => {
                  const cat = CATEGORY_BY_TOKEN[r.category];
                  return (
                    <Pressable key={r.id} style={styles.incomeRow} onPress={() => openEdit(r)}>
                      <Text style={styles.incomeIcon}>{cat?.emoji ?? '·'}</Text>
                      <Text style={styles.incomeLabel}>{cat?.label ?? r.category}</Text>
                      {r.amount > 0 && (
                        <Text style={styles.incomeAmount}>{r.amount.toLocaleString()}원</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Photocard entry — replaces DayFeelingCard, shown when selected day has spending */}
        {selectedSpendingExpenses.length > 0 && (
          <Pressable style={styles.photocardEntryBtn} onPress={openDayPhotocard}>
            <Text style={styles.photocardEntryText}>포토카드 생성</Text>
          </Pressable>
        )}

        {/* Observation block — replaces 결산. No title; three groups flow. */}
        <View style={styles.settlementSection}>
          {cadenceLines.map((line) => (
            <Text key={line} style={styles.cadenceLine}>{line}</Text>
          ))}

          {monthVisitDays > 0 && topCategoryThisMonth && (
            <View style={styles.settlementChip}>
              <Text style={styles.settlementChipText}>
                {formatCategoryWithEmoji(topCategoryThisMonth)} · 가장 자주 기록한 장면
              </Text>
            </View>
          )}

          {monthVisitDays > 0 && (
            <Text style={styles.observationLine}>{observation}</Text>
          )}
        </View>

        {/* Month presence row — soft trace of this month, not a chart */}
        <MonthPresenceRow
          viewYear={viewYear}
          viewMonth={viewMonth}
          daysInMonth={daysInMonth}
          expensesByDate={expensesByDate}
          todayStr={todayStr}
        />

      </ScrollView>

      <BottomTabs activeRoute="/stats" />

      {/* Edit backdrop */}
      {editingExpense !== null && (
        <Pressable style={styles.editBackdrop} onPress={closeEdit} />
      )}

      {/* Edit sheet */}
      <Animated.View
        style={[styles.editSheet, { transform: [{ translateY: editSheetAnim }], bottom: editSheetBottom }]}
        pointerEvents={editingExpense !== null ? 'auto' : 'none'}
      >
        <Text style={styles.editSheetTitle}>기록을 조금 고칠게요</Text>

        <Text style={styles.editFieldLabel}>금액</Text>
        <TextInput
          style={styles.editAmountInput}
          value={editAmount}
          onChangeText={setEditAmount}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={COLORS.textLight}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <Text style={styles.editFieldLabel}>분류</Text>
        <View style={styles.editCategoryRow}>
          {editingExpensePool.map((c) => (
            <Pressable
              key={c.key}
              style={[styles.editCatPill, editCategory === c.key && styles.editCatPillActive]}
              onPress={() => setEditCategory(c.key)}
            >
              <Text style={[styles.editCatPillText, editCategory === c.key && styles.editCatPillTextActive]}>
                {c.label} {c.emoji}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.editFieldLabel}>메모 (선택)</Text>
        <TextInput
          style={styles.editMemoInput}
          value={editMemo}
          onChangeText={setEditMemo}
          placeholder="없으면 비워두세요"
          placeholderTextColor={COLORS.textLight}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          maxLength={60}
        />

        <View style={styles.editActionRow}>
          <Pressable style={styles.editSaveBtn} onPress={commitEdit}>
            <Text style={styles.editSaveBtnText}>고쳐두기</Text>
          </Pressable>
          <Pressable style={styles.editCancelBtn} onPress={closeEdit}>
            <Text style={styles.editCancelBtnText}>취소</Text>
          </Pressable>
        </View>

        <View style={styles.editDeleteArea}>
          {!deleteConfirm ? (
            <Pressable onPress={() => setDeleteConfirm(true)}>
              <Text style={styles.editDeleteTriggerText}>삭제</Text>
            </Pressable>
          ) : (
            <View style={styles.editDeleteConfirmRow}>
              <Text style={styles.editDeleteConfirmLabel}>이 기록을 지울까요?</Text>
              <Pressable onPress={commitDelete}>
                <Text style={styles.editDeleteYesText}>지우기</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteConfirm(false)}>
                <Text style={styles.editDeleteNoText}>아니요</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Photocard modal — full-screen dark overlay */}
      {showDayPhotocard && dayFeeling && (
        <Pressable style={styles.photocardModal} onPress={closeDayPhotocard}>
          <View style={styles.cardArea}>
            <PhotocardView
              quote={dayFeeling.mainLine}
              dateStr={photocardDateStr}
              weekdayLabel={photocardWeekday}
              amount={selectedData?.total ?? 0}
              records={photocardRecords}
              currentEmotion={dayFeeling.sobagiEmotion}
              quoteAnimated
            />
            <Animated.View
              style={[styles.revealOverlay, { opacity: dayRevealAnim }]}
              pointerEvents="none"
            />
          </View>
          <View style={styles.closeHint} pointerEvents="none">
            <Text style={styles.closeHintText}>✕</Text>
          </View>
        </Pressable>
      )}

      {/* Month picker — opens from the calendar header. Backdrop tap closes
          without committing; tapping a month chip commits and closes. */}
      {showMonthPicker && (
        <Pressable style={styles.monthPickerOverlay} onPress={closeMonthPicker}>
          <Pressable style={styles.monthPickerCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.monthPickerYearRow}>
              <Pressable onPress={pickerPrevYear} style={styles.monthPickerArrowBtn} hitSlop={8}>
                <Text style={styles.monthPickerArrow}>‹</Text>
              </Pressable>
              <Text style={styles.monthPickerYearLabel}>{pickerYear}년</Text>
              <Pressable
                onPress={pickerNextYear}
                style={[
                  styles.monthPickerArrowBtn,
                  pickerYear >= today.getFullYear() && styles.monthPickerArrowBtnDisabled,
                ]}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.monthPickerArrow,
                    pickerYear >= today.getFullYear() && styles.monthPickerArrowDisabled,
                  ]}
                >
                  ›
                </Text>
              </Pressable>
            </View>
            <View style={styles.monthGrid}>
              {[0, 1, 2].map((rowIdx) => (
                <View key={rowIdx} style={styles.monthGridRow}>
                  {[0, 1, 2, 3].map((colIdx) => {
                    const m = rowIdx * 4 + colIdx;
                    const isFuture =
                      pickerYear > today.getFullYear() ||
                      (pickerYear === today.getFullYear() && m > today.getMonth());
                    const isCurrent = pickerYear === viewYear && m === viewMonth;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => !isFuture && selectMonth(pickerYear, m)}
                        disabled={isFuture}
                        style={[
                          styles.monthChip,
                          isCurrent && styles.monthChipCurrent,
                          isFuture && styles.monthChipDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.monthChipText,
                            isCurrent && styles.monthChipTextCurrent,
                            isFuture && styles.monthChipTextDisabled,
                          ]}
                        >
                          {m + 1}월
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: COLORS.cream,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  headerSub: { fontSize: 13, color: COLORS.textMuted },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16, paddingTop: 8 },

  calendarCard: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 18,
    padding: 16,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8 },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: { fontSize: 22, color: COLORS.oliveGreen, fontWeight: '600' },
  navArrowDisabled: { color: COLORS.textLight },
  monthLabelBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  // Month picker overlay — soft Sobagi modal, not a system picker.
  // 88% width with maxWidth 360 keeps the card comfortable on small phones
  // (~360pt screens) and stops it sprawling on larger devices.
  monthPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 20, 16, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  monthPickerCard: {
    width: '88%',
    maxWidth: 360,
    backgroundColor: COLORS.warmWhite,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  monthPickerYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  monthPickerArrowBtn: { padding: 6 },
  monthPickerArrowBtnDisabled: { opacity: 0.3 },
  monthPickerArrow: { fontSize: 20, color: COLORS.oliveGreen, fontWeight: '600' },
  monthPickerArrowDisabled: { color: COLORS.textLight },
  monthPickerYearLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  // 4×3 grid built from row containers — chips use `flex: 1` so each row
  // distributes width evenly regardless of card size, with consistent gaps.
  // Avoids the percentage-width + `gap` interaction that produced uneven
  // chips and tall/skinny ratios on-device.
  monthGrid: { gap: 8 },
  monthGridRow: { flexDirection: 'row', gap: 8 },
  monthChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cream,
  },
  monthChipCurrent: {
    backgroundColor: COLORS.oliveGreen,
  },
  monthChipDisabled: {
    opacity: 0.3,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  monthChipTextCurrent: {
    color: '#fff',
  },
  monthChipTextDisabled: {
    color: COLORS.textLight,
  },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  dowSun: { color: '#C47B7B' },
  dowSat: { color: '#7B9BC4' },
  grid: { gap: 2 },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3, borderRadius: 8 },
  cellSelected: { backgroundColor: COLORS.oliveGreen },
  cellToday: { backgroundColor: COLORS.surface },
  dayNum: { fontSize: 13, color: COLORS.text, fontWeight: '400', height: 20, lineHeight: 20 },
  dayNumSelected: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: COLORS.oliveGreen, fontWeight: '700' },
  dayNumFuture: { color: COLORS.textLight },
  daySun: { color: '#C47B7B' },
  daySat: { color: '#7B9BC4' },
  dayAmount: { fontSize: 9, color: COLORS.textMuted, marginTop: 1, height: 12, lineHeight: 12 },
  dayAmountSelected: { color: 'rgba(255,255,255,0.85)' },
  dayAmountPlaceholder: { height: 12 },

  // Day card
  dayCard: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14,
    padding: 18,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    gap: 10,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  dayCardTitle: { fontSize: 13, color: COLORS.textMuted },
  dayCardTotal: { fontSize: 20, fontWeight: '700', color: COLORS.text },

  // Expense list
  expenseList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    gap: 0,
  },
  recordDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordCategory: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  recordRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordEmotion: {
    fontSize: 16,
  },
  recordAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  recordMemo: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    marginLeft: 2,
    lineHeight: 16,
  },
  recordChevron: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 4,
  },

  // Income section
  incomeSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  incomeSectionTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  incomeIcon: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
  incomeLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 4,
  },
  incomeAmount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  incomeSectionStandalone: {
    borderTopWidth: 0,
    paddingTop: 0,
    marginTop: 8,
  },

  // Photocard entry button
  photocardEntryBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photocardEntryText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },

  // Settlement
  settlementSection: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14,
    padding: 18,
    gap: 12,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  settlementChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  settlementChipText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  cadenceLine: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  observationLine: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
  },

  // Photocard modal
  photocardModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A1410',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArea: {},
  revealOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: '#FAF6EE',
  },
  closeHint: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeHintText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Edit sheet
  editBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  editSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  editSheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  editFieldLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 6,
  },
  editAmountInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  editCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  editCatPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  editCatPillActive: {
    backgroundColor: COLORS.oliveGreen,
  },
  editCatPillText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  editCatPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  editMemoInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: COLORS.text,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  editSaveBtn: {
    flex: 1,
    backgroundColor: COLORS.oliveGreen,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  editSaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  editCancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  editCancelBtnText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  editDeleteArea: {
    marginTop: 16,
    alignItems: 'center',
  },
  editDeleteTriggerText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  editDeleteConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editDeleteConfirmLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  editDeleteYesText: {
    fontSize: 12,
    color: '#C96A45',
    fontWeight: '600',
  },
  editDeleteNoText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});

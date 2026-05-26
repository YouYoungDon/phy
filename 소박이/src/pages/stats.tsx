import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, TextInput, Keyboard, Platform } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { Expense, ExpenseCategory } from '../types';
import { COLORS } from '../constants/colors';
import { getLocalDateString, expenseLocalDate } from '../utils/date';
import { parseAmountInput, formatAmountInput } from '../utils/amount';
import { amountValidForKind } from '../utils/recordValidation';
import { BottomTabs } from '../components/common/BottomTabs';
import { PhotocardView, PhotocardRecord, CARD_WIDTH } from '../components/photocard/PhotocardView';
import { getDayFeeling } from '../services/dayFeelingService';
import { updateExpense as persistUpdateExpense, deleteExpense as persistDeleteExpense } from '../services/expenseService';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { GENERAL_SPENDING_CATEGORIES, INCOME_CATEGORIES, kindForCategory, formatCategoryWithEmoji, formatCategoryLabel, CATEGORY_BY_TOKEN } from '../constants/categories';
import { selectStatsObservation } from '../services/statsObservationService';
import { MonthAmountChart } from '../components/stats/MonthAmountChart';
import { selectCalendarCellContent, CalendarViewMode, CellDisplay } from '../components/stats/calendarCell.helpers';

export const Route = createRoute('/stats', {
  validateParams: (params) => params,
  component: StatsScreen,
});

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_LABELS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const CALENDAR_VIEW_MODES: { mode: CalendarViewMode; label: string }[] = [
  { mode: 'spending', label: '쓴 기록' },
  { mode: 'income', label: '들어온 기록' },
  { mode: 'both', label: '함께 보기' },
];

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

// Renders the calendar cell's amount/marker slot from a CellDisplay descriptor.
// Module-level (uses module `styles`); kept here so the grid map stays readable.
function DayAmountSlot({ cell, isSelected }: { cell: CellDisplay; isSelected: boolean }) {
  const textStyle = [styles.dayAmount, isSelected && styles.dayAmountSelected];
  switch (cell.kind) {
    case 'blank':
      return <View style={styles.dayAmountPlaceholder} />;
    case 'leaf':
      return <Text style={textStyle} numberOfLines={1}>🌿</Text>;
    case 'amount':
      return (
        <Text style={textStyle} numberOfLines={1} ellipsizeMode="tail">
          {cell.amount.toLocaleString('ko-KR')}
        </Text>
      );
  }
}

// ─── Main screen ─────────────────────────────────────────────────────────────

// Quiet lines for a no-spend-only photocard — no amount, no finance framing.
// A no-spend day is a calm record of a day that passed gently, not a savings
// result. Picked deterministically by date so a given day's card is stable.
const NO_SPEND_PHOTOCARD_QUOTES = [
  '오늘은 조용히 지나간 하루 🌿',
  '쓰지 않은 기록도 하나의 생활이에요',
  '가볍게 지나간 날을 남겨두었어요',
];

function StatsScreen() {
  const expenses = useExpenseStore((s) => s.expenses);
  const streak = useUserStore((s) => s.streak);

  const today = new Date();
  const todayStr = getLocalDateString(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const [showDayPhotocard, setShowDayPhotocard] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('spending');

  // Month picker — separate "pickerYear" state so the user can browse years
  // inside the modal without committing until they tap a month. Reset to
  // viewYear every time the picker opens.
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());

  const dayRevealAnim = useRef(new Animated.Value(1)).current;

  type DayAccum = {
    total: number;
    count: number;
    categories: ExpenseCategory[];
    hasRecord: boolean;
    hasOnlyNoSpend: boolean;
    incomeTotal: number;
  };

  const expensesByDate = useMemo(() => {
    const map: Record<string, DayAccum> = {};
    for (const e of expenses) {
      const d = expenseLocalDate(e);
      if (!map[d]) map[d] = { total: 0, count: 0, categories: [], hasRecord: false, hasOnlyNoSpend: true, incomeTotal: 0 };
      map[d].hasRecord = true;
      if (e.category !== 'no_spend') map[d].hasOnlyNoSpend = false;
      // income counts as presence (hasRecord above) + feeds the income view's
      // per-day total, but never the spending `total`.
      if (e.kind === 'income') { map[d].incomeTotal += e.amount; continue; }
      map[d].total += e.amount;
      map[d].count += 1;
      map[d].categories.push(e.category);
    }
    return map;
  }, [expenses]);

  const selectedExpenses = useMemo(
    () => expenses.filter((e) => expenseLocalDate(e) === selectedDay),
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

  // No-spend marks (amount 0, category 'no_spend'). Surfaced in the day card so
  // a misfired 무지출 has a delete entry point — otherwise the only trace is the
  // calendar 🌿 with no way to remove it.
  const selectedNoSpendExpenses = useMemo(
    () => selectedExpenses.filter((e) => e.category === 'no_spend'),
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
      if (!expenseLocalDate(e).startsWith(prefix)) continue;
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
      const d = expenseLocalDate(e);
      if (d >= startStr && d <= endStr) days.add(d);
    }
    return days.size;
  }, [expenses, todayStr]);

  // Distinct local-date days with ANY record in the current view month.
  const monthVisitDays = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const days = new Set<string>();
    for (const e of expenses) {
      const d = expenseLocalDate(e);
      if (d.startsWith(prefix)) days.add(d);
    }
    return days.size;
  }, [expenses, viewYear, viewMonth]);

  // Two independent monthly totals for the settlement line: spending and
  // income. Deliberately NO net/balance/차액 — this is the one scoped
  // exception to the no-income-totals rule (see the monthly-settlement spec).
  // no_spend carries amount 0, so it's harmless in the spending sum.
  const monthSettlement = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    let spending = 0;
    let income = 0;
    for (const e of expenses) {
      if (!expenseLocalDate(e).startsWith(prefix)) continue;
      if (e.kind === 'income') income += e.amount;
      else spending += e.amount;
    }
    return { spending, income };
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

  // Photocard records include both spending and income (sub-spec B), so
  // PhotocardView's groupByKind can render the 들어온 기록 section on mixed
  // days. The entry-point gate (canOpenDayPhotocard below) hides the button
  // for income-only days, so an income-only day never reaches PhotocardView.
  // A no-spend-only day surfaces a single quiet 🌿 무지출 line (its amount is
  // hidden by PhotocardView's showsAmount — no ₩0) so the card isn't
  // record-less; the line is dropped the moment any spending/income exists.
  const photocardRecords: PhotocardRecord[] = useMemo(() => {
    const spendingIncome = selectedExpenses
      .filter((e) => e.category !== 'no_spend')
      .map((e) => ({
        id: e.id,
        category: e.category,
        categoryLabel: formatCategoryLabel(e.category),
        amount: e.amount,
        memo: e.memo,
        kind: e.kind,
      }));
    if (spendingIncome.length > 0) return spendingIncome;
    const noSpend = selectedExpenses.find((e) => e.category === 'no_spend');
    if (noSpend) {
      return [{
        id: noSpend.id,
        category: 'no_spend',
        categoryLabel: formatCategoryLabel('no_spend'),
        amount: 0,
        kind: noSpend.kind,
      }];
    }
    return [];
  }, [selectedExpenses]);

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

  // No-spend-only days have no spending feeling, so the photocard can still open
  // (sub-spec: 무지출도 하나의 기록) using a quiet line + calm emotion + a single
  // 🌿 무지출 record row (built in photocardRecords above).
  const isNoSpendOnlyDay =
    selectedSpendingExpenses.length === 0 &&
    selectedIncomeExpenses.length === 0 &&
    selectedNoSpendExpenses.length > 0;
  const canOpenDayPhotocard = selectedSpendingExpenses.length > 0 || isNoSpendOnlyDay;
  const photocardQuote = dayFeeling
    ? dayFeeling.mainLine
    : (NO_SPEND_PHOTOCARD_QUOTES[selectedDt.getDate() % NO_SPEND_PHOTOCARD_QUOTES.length]
        ?? '오늘은 조용히 지나간 하루 🌿');
  const photocardEmotion = dayFeeling ? dayFeeling.sobagiEmotion : ('happy' as const);

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
  // In-flight + failure state for edit/delete persistence. `editSaving` guards
  // against double-taps; `editError` keeps the sheet open with a message when a
  // write fails (and was rolled back) so the UI never shows a false success.
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(false);
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
    setEditAmount(formatAmountInput(String(expense.amount)));
    setEditCategory(expense.category);
    setEditMemo(expense.memo ?? '');
    setDeleteConfirm(false);
    setEditError(false);
    setEditSaving(false);
    Animated.spring(editSheetAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
  }, [editSheetAnim]);

  const closeEdit = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(editSheetAnim, { toValue: 500, duration: 210, useNativeDriver: true }).start(() => {
      setEditingExpense(null);
      setDeleteConfirm(false);
      setEditSheetBottom(0);
      setEditError(false);
      setEditSaving(false);
    });
  }, [editSheetAnim]);

  // Single guarded dismiss for every user-initiated close path (backdrop tap,
  // 취소 button, Android back). While a save/delete is in flight the sheet is
  // locked, so it can't disappear mid-operation and read as success. The
  // programmatic closeEdit used by the success paths stays unguarded.
  const dismissEdit = useCallback(() => {
    if (editSaving) return;
    closeEdit();
  }, [editSaving, closeEdit]);

  const commitEdit = useCallback(async () => {
    if (!editingExpense || editSaving) return;
    // Shared parse + validity rule with the create flow (record.tsx):
    // `parseAmountInput` normalizes blanks/junk to 0; income may be 0 (amount
    // optional), spending must be positive.
    const parsed = parseAmountInput(editAmount);
    const nextKind = kindForCategory(editCategory);
    if (!amountValidForKind(nextKind, parsed)) return;
    setEditSaving(true);
    setEditError(false);
    const ok = await persistUpdateExpense(editingExpense.id, {
      amount: parsed,
      category: editCategory,
      memo: editMemo.trim() || undefined,
      kind: nextKind,
    });
    setEditSaving(false);
    if (!ok) {
      // Write failed and the in-memory edit was rolled back. Keep the sheet open
      // with an error so the user sees it didn't save and can retry.
      setEditError(true);
      return;
    }
    closeEdit();
  }, [editingExpense, editSaving, editAmount, editCategory, editMemo, closeEdit]);

  // Mirror of commitEdit's validity gate, for the save button's enabled state
  // and the inline hint — so a blocked spending edit shows visible feedback
  // instead of a silent no-op.
  const editKind = kindForCategory(editCategory);
  const editCanSave = amountValidForKind(editKind, parseAmountInput(editAmount));

  // No-spend records have nothing meaningful to edit (amount 0, fixed category).
  // The edit sheet collapses to a quiet label + delete-only affordance for them.
  const editingNoSpend = editingExpense?.category === 'no_spend';

  const commitDelete = useCallback(async () => {
    if (!editingExpense || editSaving) return;
    setEditSaving(true);
    setEditError(false);
    const ok = await persistDeleteExpense(editingExpense.id);
    setEditSaving(false);
    if (!ok) {
      // Delete didn't persist (rolled back in memory). Keep the sheet + confirm
      // open with an error so the record visibly remains and can be retried.
      setEditError(true);
      return;
    }
    closeEdit();
  }, [editingExpense, editSaving, closeEdit]);

  // Android hardware back closes the topmost open stats overlay before route
  // back: photocard modal → month picker → edit sheet.
  const handleAndroidBack = useCallback(() => {
    if (showDayPhotocard) { closeDayPhotocard(); return; }
    if (showMonthPicker) { closeMonthPicker(); return; }
    if (editingExpense !== null) { dismissEdit(); return; }
  }, [showDayPhotocard, showMonthPicker, editingExpense, closeDayPhotocard, closeMonthPicker, dismissEdit]);
  useAndroidBack(
    showDayPhotocard || showMonthPicker || editingExpense !== null,
    handleAndroidBack,
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>소소한 기록</Text>
            <Text style={styles.headerSub}>이번 달을 조용히 돌아봐요</Text>
          </View>
          <View style={styles.viewToggle}>
            {CALENDAR_VIEW_MODES.map(({ mode, label }) => (
              <Pressable
                key={mode}
                style={[styles.viewPill, calendarViewMode === mode && styles.viewPillActive]}
                onPress={() => setCalendarViewMode(mode)}
                hitSlop={4}
              >
                <Text style={[styles.viewPillText, calendarViewMode === mode && styles.viewPillTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
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
            <Pressable onPress={nextMonth} style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]} disabled={isCurrentMonth}>
              <Text style={[styles.navArrow, isCurrentMonth && styles.navArrowDisabled]}>›</Text>
            </Pressable>
          </View>

          <View style={styles.monthTotalRow}>
            <Text style={styles.monthTotalLabel}>쓴 돈</Text>
            <Text style={styles.monthTotalValue}>{monthSettlement.spending.toLocaleString()}원</Text>
            <Text style={styles.monthTotalSep}>·</Text>
            <Text style={styles.monthTotalLabel}>들어온 돈</Text>
            <Text style={styles.monthTotalValue}>{monthSettlement.income.toLocaleString()}원</Text>
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
                      disabled={isFuture}
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
                      <DayAmountSlot
                        cell={selectCalendarCellContent(calendarViewMode, {
                          spendingTotal: data?.total ?? 0,
                          incomeTotal: data?.incomeTotal ?? 0,
                          hasRecord: !!data,
                        })}
                        isSelected={isSelected}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Selected day card — renders when the day has any record: spending,
            income, or a no-spend mark. No-spend-only days surface the card too
            so the 무지출 record has a delete entry point. */}
        {(selectedSpendingExpenses.length > 0 ||
          selectedIncomeExpenses.length > 0 ||
          selectedNoSpendExpenses.length > 0) && (
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
                {selectedIncomeExpenses.map((r, idx) => {
                  const cat = CATEGORY_BY_TOKEN[r.category];
                  return (
                    <React.Fragment key={r.id}>
                      {idx > 0 && <View style={styles.recordDivider} />}
                      <Pressable style={styles.incomeRow} onPress={() => openEdit(r)}>
                        <Text style={styles.incomeIcon}>{cat?.emoji ?? '·'}</Text>
                        <Text style={styles.incomeLabel}>{cat?.label ?? r.category}</Text>
                        {r.userEmotion ? (
                          <Text style={styles.incomeEmotion}>{r.userEmotion}</Text>
                        ) : null}
                        {r.amount > 0 && (
                          <Text style={styles.incomeAmount}>{r.amount.toLocaleString()}원</Text>
                        )}
                        <Text style={styles.recordChevron}>›</Text>
                      </Pressable>
                    </React.Fragment>
                  );
                })}
              </View>
            )}
            {selectedNoSpendExpenses.length > 0 && (
              <View
                style={[
                  styles.incomeSection,
                  selectedSpendingExpenses.length === 0 &&
                    selectedIncomeExpenses.length === 0 &&
                    styles.incomeSectionStandalone,
                ]}
              >
                {selectedNoSpendExpenses.map((r, idx) => (
                  <React.Fragment key={r.id}>
                    {idx > 0 && <View style={styles.recordDivider} />}
                    <Pressable style={styles.incomeRow} onPress={() => openEdit(r)}>
                      <Text style={styles.incomeIcon}>🌿</Text>
                      <Text style={styles.incomeLabel}>무지출</Text>
                      <Text style={styles.recordChevron}>›</Text>
                    </Pressable>
                  </React.Fragment>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Photocard entry — shown for spending days and no-spend-only days.
            Income-only days stay without a card (sub-spec B D2 unchanged). */}
        {canOpenDayPhotocard && (
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

        {/* Month amount chart — bar trace of spending across this month */}
        <MonthAmountChart
          viewYear={viewYear}
          viewMonth={viewMonth}
          daysInMonth={daysInMonth}
          expensesByDate={expensesByDate}
          todayStr={todayStr}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

      </ScrollView>

      <BottomTabs activeRoute="/stats" />

      {/* Edit backdrop */}
      {editingExpense !== null && (
        <Pressable style={styles.editBackdrop} onPress={dismissEdit} />
      )}

      {/* Edit sheet */}
      <Animated.View
        style={[styles.editSheet, { transform: [{ translateY: editSheetAnim }], bottom: editSheetBottom }]}
        pointerEvents={editingExpense !== null ? 'auto' : 'none'}
      >
        <Text style={styles.editSheetTitle}>
          {editingNoSpend ? '무지출 기록' : '기록을 조금 고칠게요'}
        </Text>

        {editingNoSpend ? (
          <Text style={styles.noSpendEditHint}>이 날은 무지출로 기록했어요 🌿</Text>
        ) : (
          <>
        <Text style={styles.editFieldLabel}>금액</Text>
        <TextInput
          style={styles.editAmountInput}
          value={editAmount}
          onChangeText={(t) => setEditAmount(formatAmountInput(t))}
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

        {editingExpense !== null && !editCanSave && (
          <Text style={styles.editHint}>금액을 입력해 주세요</Text>
        )}

        <View style={styles.editActionRow}>
          <Pressable
            style={[styles.editSaveBtn, (!editCanSave || editSaving) && styles.editSaveBtnDisabled]}
            onPress={commitEdit}
            disabled={!editCanSave || editSaving}
          >
            <Text style={styles.editSaveBtnText}>고쳐두기</Text>
          </Pressable>
          <Pressable
            style={[styles.editCancelBtn, editSaving && styles.editCancelBtnDisabled]}
            onPress={dismissEdit}
            disabled={editSaving}
          >
            <Text style={styles.editCancelBtnText}>취소</Text>
          </Pressable>
        </View>
          </>
        )}

        {editError && (
          <Text style={styles.editErrorText}>처리하지 못했어요. 잠시 후 다시 시도해 주세요</Text>
        )}

        <View style={styles.editDeleteArea}>
          {!deleteConfirm ? (
            <Pressable onPress={() => setDeleteConfirm(true)}>
              <Text style={styles.editDeleteTriggerText}>삭제</Text>
            </Pressable>
          ) : (
            <View style={styles.editDeleteConfirmRow}>
              <Text style={styles.editDeleteConfirmLabel}>이 기록을 지울까요?</Text>
              <Pressable onPress={commitDelete} disabled={editSaving}>
                <Text style={styles.editDeleteYesText}>지우기</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteConfirm(false)}>
                <Text style={styles.editDeleteNoText}>아니요</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Photocard modal — full-screen dark overlay. Backdrop and card are
          separated: only the backdrop closes; the card absorbs its own presses
          (stopPropagation) so tapping the card never closes it. */}
      {showDayPhotocard && canOpenDayPhotocard && (
        <Pressable style={styles.photocardModal} onPress={closeDayPhotocard}>
          {/* Bounded scroll: card-width so taps beside it still hit the backdrop
              and close. Fits and centers on normal screens; scrolls instead of
              clipping when a tall day's card exceeds a small screen. */}
          <ScrollView
            style={styles.cardScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Pressable style={styles.cardArea} onPress={(e) => e.stopPropagation()}>
              <PhotocardView
                quote={photocardQuote}
                dateStr={photocardDateStr}
                weekdayLabel={photocardWeekday}
                records={photocardRecords}
                currentEmotion={photocardEmotion}
                quoteAnimated
              />
              <Animated.View
                style={[styles.revealOverlay, { opacity: dayRevealAnim }]}
                pointerEvents="none"
              />
            </Pressable>
          </ScrollView>
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
                disabled={pickerYear >= today.getFullYear()}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitleCol: {
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
    flexShrink: 0,
  },
  viewPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  viewPillActive: {
    backgroundColor: COLORS.surface,
  },
  viewPillText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  viewPillTextActive: {
    color: COLORS.oliveDark,
    fontWeight: '600',
  },
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

  // Monthly settlement — one quiet line under the month label. Two separate
  // totals (쓴 돈 / 들어온 돈), no net/balance. Body color, no green emphasis,
  // no card/border around it.
  monthTotalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  monthTotalLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  monthTotalValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  monthTotalSep: {
    fontSize: 12,
    color: COLORS.textLight,
  },

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
  incomeEmotion: {
    fontSize: 14,
    marginRight: 6,
  },
  incomeAmount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginRight: 4,
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
  // Card-width + maxHeight: shrinks to the card (centered, no scroll) when it
  // fits; caps and scrolls on small screens so a tall card never clips.
  cardScroll: {
    width: CARD_WIDTH,
    maxHeight: '85%',
  },
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
  editSaveBtnDisabled: {
    opacity: 0.4,
  },
  editSaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  editHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  noSpendEditHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  editErrorText: {
    fontSize: 12,
    color: '#B5705A',
    marginTop: 10,
  },
  editCancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  editCancelBtnDisabled: {
    opacity: 0.4,
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

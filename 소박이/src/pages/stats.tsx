import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { createRoute } from '@granite-js/react-native';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { Expense, ExpenseCategory } from '../types';
import { COLORS } from '../constants/colors';
import { getLocalDateString } from '../utils/date';
import { BottomTabs } from '../components/common/BottomTabs';

export const Route = createRoute('/stats', {
  validateParams: (params) => params,
  component: StatsScreen,
});

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  cafe: '카페 ☕',
  food: '식비 🍚',
  transport: '교통 🚌',
  shopping: '쇼핑 🛍️',
  other: '기타 📦',
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function fmtAmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

// ─── Trend graph ─────────────────────────────────────────────────────────────

const TREND_BAR_MAX = 72;
const Y_AXIS_W = 52;
const TREND_LABEL_DAYS = new Set([1, 8, 15, 22, 29]);

interface TrendGraphProps {
  viewYear: number;
  viewMonth: number;
  daysInMonth: number;
  expensesByDate: Record<string, { total: number }>;
}

function MonthTrendGraph({ viewYear, viewMonth, daysInMonth, expensesByDate }: TrendGraphProps) {
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, dateStr, total: expensesByDate[dateStr]?.total ?? 0 };
    });
  }, [viewYear, viewMonth, daysInMonth, expensesByDate]);

  const maxTotal = useMemo(() => {
    let m = 0;
    for (const d of days) if (d.total > m) m = d.total;
    return m > 0 ? m : 1;
  }, [days]);

  const midTotal = Math.round(maxTotal / 2);

  return (
    <View style={trendStyles.card}>
      <Text style={trendStyles.title}>이달의 흐름</Text>
      <View style={trendStyles.wrapper}>
        {/* Y-axis labels */}
        <View style={trendStyles.yAxis}>
          <Text style={trendStyles.yLabel}>{fmtAmt(maxTotal)}</Text>
          <Text style={trendStyles.yLabel}>{fmtAmt(midTotal)}</Text>
          <Text style={trendStyles.yLabel}>0</Text>
        </View>

        {/* Chart area */}
        <View style={{ flex: 1 }}>
          {/* Bar area with guide lines */}
          <View style={trendStyles.barArea}>
            {/* Guide lines at 100%, 50%, 0% */}
            <View style={[trendStyles.guideLine, { top: 0 }]} />
            <View style={[trendStyles.guideLine, { top: TREND_BAR_MAX / 2 }]} />
            <View style={[trendStyles.guideLine, { bottom: 0 }]} />

            {/* Bars */}
            <View style={trendStyles.barsRow}>
              {days.map(({ day, total }) => {
                const hasData = total > 0;
                const barHeight = hasData
                  ? Math.max(Math.round((total / maxTotal) * TREND_BAR_MAX), 8)
                  : 2;
                return (
                  <View key={day} style={trendStyles.barColumn}>
                    <View
                      style={[
                        trendStyles.bar,
                        { height: barHeight },
                        hasData ? trendStyles.barFilled : trendStyles.barEmpty,
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* X-axis labels */}
          <View style={trendStyles.xRow}>
            {days.map(({ day }) => (
              <View key={day} style={trendStyles.xCell}>
                <Text style={trendStyles.xLabel}>
                  {TREND_LABEL_DAYS.has(day) ? String(day) : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Day expense list ─────────────────────────────────────────────────────────

function ExpenseList({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) return null;
  return (
    <View style={styles.expenseList}>
      {expenses.map((e, idx) => (
        <View key={e.id}>
          {idx > 0 && <View style={styles.recordDivider} />}
          <View style={styles.recordRow}>
            <Text style={styles.recordCategory}>{CATEGORY_LABELS[e.category]}</Text>
            <View style={styles.recordRight}>
              {e.userEmotion ? (
                <Text style={styles.recordEmotion}>{e.userEmotion}</Text>
              ) : null}
              <Text style={styles.recordAmount}>{e.amount.toLocaleString()}원</Text>
            </View>
          </View>
          {e.memo ? (
            <Text style={styles.recordMemo}>{e.memo}</Text>
          ) : null}
        </View>
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

  const expensesByDate = useMemo(() => {
    const map: Record<string, { total: number; count: number; categories: ExpenseCategory[] }> = {};
    for (const e of expenses) {
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

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`;

  const selectedData = expensesByDate[selectedDay] ?? null;
  const selectedDt = new Date(selectedDay + 'T00:00:00');
  const selectedLabel = `${selectedDt.getMonth() + 1}월 ${selectedDt.getDate()}일`;

  const dayComment = selectedData
    ? selectedData.total >= 50000
      ? '오늘은 꽤 많이 썼네요. 그래도 기록한 게 대단해요 💪'
      : selectedData.count >= 3
        ? '여러 번 기록했군요, 꼼꼼한 하루였어요 🌿'
        : '소박한 하루를 보냈네요 🍃'
    : '이날은 조용히 지나갔어요 🌿';

  const weeklyTotal = useMemo(() => {
    const d = new Date(today);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const monStr = getLocalDateString(monday);
    const sunStr = getLocalDateString(sunday);
    return expenses
      .filter((e) => {
        const ds = getLocalDateString(new Date(e.createdAt));
        return ds >= monStr && ds <= sunStr;
      })
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const monthlyTotal = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return expenses
      .filter((e) => getLocalDateString(new Date(e.createdAt)).startsWith(prefix))
      .reduce((s, e) => s + e.amount, 0);
  }, [expenses, viewYear, viewMonth]);

  const topCategoryThisMonth = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const counts: Partial<Record<ExpenseCategory, number>> = {};
    for (const e of expenses) {
      if (!getLocalDateString(new Date(e.createdAt)).startsWith(prefix)) continue;
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
    return (Object.entries(counts) as [ExpenseCategory, number][])
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  }, [expenses, viewYear, viewMonth]);

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
            <Text style={styles.monthLabel}>{monthLabel}</Text>
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
                        <Text style={[styles.dayAmount, isSelected && styles.dayAmountSelected]}>
                          {data.total.toLocaleString('ko-KR')}
                        </Text>
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

        {/* Selected day card */}
        <View style={styles.dayCard}>
          <View style={styles.dayCardHeader}>
            <Text style={styles.dayCardTitle}>{selectedLabel}</Text>
            {selectedData && (
              <Text style={styles.dayCardTotal}>{selectedData.total.toLocaleString()}원</Text>
            )}
          </View>

          {selectedExpenses.length > 0 ? (
            <>
              <Text style={styles.dayCardComment}>{dayComment}</Text>
              <ExpenseList expenses={selectedExpenses} />
            </>
          ) : (
            <Text style={styles.dayCardEmpty}>{dayComment}</Text>
          )}
        </View>

        {/* Settlement */}
        <View style={styles.settlementSection}>
          <Text style={styles.settlementTitle}>결산</Text>
          <View style={styles.settlementRow}>
            <View style={styles.settlementItem}>
              <Text style={styles.settlementLabel}>이번 주</Text>
              <Text style={styles.settlementValue}>{weeklyTotal.toLocaleString()}원</Text>
            </View>
            <View style={styles.settlementDivider} />
            <View style={styles.settlementItem}>
              <Text style={styles.settlementLabel}>{viewMonth + 1}월 전체</Text>
              <Text style={styles.settlementValue}>{monthlyTotal.toLocaleString()}원</Text>
            </View>
          </View>

          {topCategoryThisMonth && (
            <View style={styles.settlementChip}>
              <Text style={styles.settlementChipText}>
                이번 달은 {CATEGORY_LABELS[topCategoryThisMonth]}이 제일 많았어요
              </Text>
            </View>
          )}

          <View style={styles.streakRow}>
            <Text style={styles.streakText}>
              {streak >= 3
                ? `소박이를 ${streak}일 연속으로 만나러 왔어요 🌿`
                : streak === 1
                  ? '오늘도 소박이를 찾아줬어요 🍃'
                  : '소박이가 기다리고 있어요 🌱'}
            </Text>
          </View>
        </View>

        {/* Trend graph */}
        <MonthTrendGraph
          viewYear={viewYear}
          viewMonth={viewMonth}
          daysInMonth={daysInMonth}
          expensesByDate={expensesByDate}
        />
      </ScrollView>

      <BottomTabs activeRoute="/stats" />
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
  monthLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
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
  dayAmount: { fontSize: 9, color: COLORS.oliveGreen, marginTop: 1, height: 12, lineHeight: 12 },
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
  dayCardComment: { fontSize: 13, color: COLORS.oliveGreen, lineHeight: 18 },
  dayCardEmpty: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },

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
  settlementTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  settlementRow: { flexDirection: 'row', alignItems: 'center' },
  settlementItem: { flex: 1, alignItems: 'center' },
  settlementLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  settlementValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  settlementDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  settlementChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  settlementChipText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  streakRow: { marginTop: 2 },
  streakText: { fontSize: 13, color: COLORS.oliveGreen, lineHeight: 18 },
});

const trendStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  wrapper: {
    flexDirection: 'row',
    gap: 6,
  },
  yAxis: {
    width: Y_AXIS_W,
    height: TREND_BAR_MAX,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  barArea: {
    height: TREND_BAR_MAX,
    position: 'relative',
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  barsRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barFilled: {
    backgroundColor: COLORS.oliveGreen,
    opacity: 0.65,
  },
  barEmpty: {
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  xRow: {
    flexDirection: 'row',
    marginTop: 3,
    marginLeft: 0,
  },
  xCell: {
    flex: 1,
    alignItems: 'center',
  },
  xLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'center',
    height: 13,
    lineHeight: 13,
  },
});

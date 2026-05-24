import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { createRoute, useNavigation } from '@granite-js/react-native';
import { CategorySelector } from '../components/expense/CategorySelector';
import { MemoSuggestions } from '../components/expense/MemoSuggestions';
import { saveExpense, recordNoSpend } from '../services/expenseService';
import { evaluate, buildEmotionContext } from '../services/emotionEngine';
import { getDialogueTier, selectReactionMessage, detectObservationType, selectObservationMessage } from '../services/dialogueService';
import * as storageService from '../services/storageService';
import { getPrevVisitDate } from '../hooks/useAppInit';
import { STORAGE_KEYS } from '../constants/storage';
import { useEmotionStore } from '../store/emotionStore';
import { useExpenseStore } from '../store/expenseStore';
import { useUserStore } from '../store/userStore';
import { ExpenseCategory, EmotionContext, RecordKind } from '../types';
import { COLORS } from '../constants/colors';
import {
  GENERAL_SPENDING_CATEGORIES,
  INCOME_CATEGORIES,
  kindForCategory,
} from '../constants/categories';
import { BottomTabs } from '../components/common/BottomTabs';
import { getLocalDateString, localDateToISOString, expenseLocalDate } from '../utils/date';
import { generateExpenseId } from '../utils/id';
import { parseAmountInput, formatAmountInput } from '../utils/amount';
import {
  incomeRecordHasIntent,
  amountValidForKind,
  INCOME_DEFAULT_CATEGORY,
} from '../utils/recordValidation';

export const Route = createRoute('/record', {
  validateParams: (params) => params,
  component: RecordScreen,
});

const USER_EMOTIONS = [
  { emoji: '😊', label: '좋아' },
  { emoji: '😐', label: '그냥' },
  { emoji: '😔', label: '속상' },
  { emoji: '😤', label: '억울' },
  { emoji: '🥰', label: '뿌듯' },
];

const MAX_PAST_DAYS = 30;

// Built per render (keyed on today's local date) rather than once at module
// load, so opening the record screen after midnight shows the correct chips.
function buildDateOptions(): { dateStr: string; label: string }[] {
  return Array.from({ length: MAX_PAST_DAYS + 1 }, (_, i) => {
    const daysAgo = MAX_PAST_DAYS - i;
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = getLocalDateString(d);
    const label =
      daysAgo === 0 ? '오늘' :
      daysAgo === 1 ? '어제' :
      `${d.getMonth() + 1}/${d.getDate()}`;
    return { dateStr, label };
  });
}

function RecordScreen() {
  const navigation = useNavigation();
  const todayStr = getLocalDateString(new Date());
  const dateOptions = useMemo(() => buildDateOptions(), [todayStr]);
  const [recordKind, setRecordKind] = useState<RecordKind>('spending');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('cafe');
  const [userEmotion, setUserEmotion] = useState<string | undefined>(undefined);
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const handleToggleKind = (nextKind: RecordKind) => {
    if (nextKind === recordKind) return;
    setRecordKind(nextKind);
    setAmountText('');
    setCategory(nextKind === 'income' ? INCOME_DEFAULT_CATEGORY : 'cafe');
    setUserEmotion(undefined);
    setMemo('');
    setSaveError(false);
  };

  // Returns the record screen to a predictable fresh state. Called after a
  // successful save (the screen may stay mounted between visits depending on
  // the navigator), which also clears the `isSavingRef` latch — otherwise a
  // retained screen would block every subsequent save.
  const resetForm = () => {
    setRecordKind('spending');
    setAmountText('');
    setCategory('cafe');
    setUserEmotion(undefined);
    setMemo('');
    setSelectedDate(todayStr);
    setSaveError(false);
    setIsSaving(false);
    isSavingRef.current = false;
  };
  const amountInputRef = useRef<TextInput>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const focusedFieldRef = useRef<'amount' | 'memo' | null>(null);
  const memoSectionYRef = useRef(0);
  // Ref-based double-tap guard. setState is async — between two fast taps,
  // the closure-captured `canSave` can still be true, so the state-based
  // disabled check alone isn't sufficient to prevent a double-save.
  const isSavingRef = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        if (focusedFieldRef.current === 'amount') {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        } else if (focusedFieldRef.current === 'memo') {
          scrollRef.current?.scrollTo({ y: memoSectionYRef.current - 16, animated: true });
        }
      }, 100);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      focusedFieldRef.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const setEmotion = useEmotionStore((s) => s.setEmotion);
  const getTodayExpenses = useExpenseStore((s) => s.getTodayExpenses);
  const streak = useUserStore((s) => s.streak);
  const recordedDaysCount = useUserStore((s) => s.recordedDaysCount);
  const totalRecordCount = useUserStore((s) => s.totalRecordCount);
  const expenses = useExpenseStore((s) => s.expenses);
  const [lastVisitDate] = useState<string | null>(() => getPrevVisitDate());
  const [lastObservationSaveCount, setLastObservationSaveCount] = useState(0);

  useEffect(() => {
    storageService.load<number>(STORAGE_KEYS.OBSERVATION_SAVE_COUNT).then((obsSaveCount) => {
      if (obsSaveCount !== null) setLastObservationSaveCount(obsSaveCount);
    });
  }, []);

  const amount = parseAmountInput(amountText);
  // Income amount is optional, but a completely default income record (salary +
  // 0 + no memo/emotion) is almost always an accidental tap — require one
  // signal of intent. Spending still requires a positive amount.
  const incomeHasIntent = incomeRecordHasIntent({ amount, memo, userEmotion, category });
  const canSave = !isSaving && (recordKind === 'income'
    ? incomeHasIntent
    : amountValidForKind('spending', amount));

  // No-spend marks a calendar day as quietly passed. Available for today and
  // any past date the user is reviewing, as long as that day has no record
  // yet. Future dates are excluded (UI doesn't surface them, but the guard
  // is defensive). saveExpense already keeps past-date marks from advancing
  // streak or triggering found-item eval, so past no-spend stays quiet.
  const isSelectedDateToday = selectedDate === todayStr;
  const hasRecordOnSelectedDate = expenses.some(
    (e) => expenseLocalDate(e) === selectedDate,
  );
  const canNoSpend =
    recordKind === 'spending' &&
    !hasRecordOnSelectedDate &&
    !isSaving &&
    selectedDate <= todayStr;

  const handleNoSpend = async () => {
    if (!canNoSpend) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(false);
    const createdAt = isSelectedDateToday
      ? new Date().toISOString()
      : localDateToISOString(selectedDate);
    const ok = await recordNoSpend(createdAt);
    if (!ok) {
      // Persistence failed and was rolled back — don't proceed to the reaction
      // as if it saved. Let the user retry.
      setSaveError(true);
      setIsSaving(false);
      isSavingRef.current = false;
      return;
    }
    setEmotion(
      'happy',
      isSelectedDateToday
        ? '오늘은 조용히 머물렀네요 🌿'
        : '조용히 지나간 하루였네요 🌙',
      'spending',
      selectedDate,
    );
    resetForm();
    navigation.navigate('/reaction');
  };

  const handleSave = async () => {
    if (!canSave) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(false);

    const createdAt = isSelectedDateToday
      ? new Date().toISOString()
      : localDateToISOString(selectedDate);

    // Emotion context is anchored to the record's date, not "now". A real-time
    // (today) save uses today's context — first-record welcome, current streak,
    // wall-clock hour. A back-dated save is quiet: it must not borrow today's
    // 'surprised' welcome or streak (it isn't today's first visit). See
    // buildEmotionContext + the date-context QA pass.
    const ctx: EmotionContext = buildEmotionContext({
      isSelectedDateToday,
      todayNonIncomeRecordCount: getTodayExpenses().filter((e) => e.kind !== 'income').length,
      streak,
      nowHour: new Date().getHours(),
      recordHour: new Date(createdAt).getHours(),
    });

    // Source of truth: category determines kind, not the UI toggle state.
    // Guards against the toggle and category being momentarily out of sync.
    const derivedKind = kindForCategory(category);

    const sobagiEmotion = evaluate(
      { id: '', kind: derivedKind, amount, category, sobagiEmotion: 'happy', createdAt: '' },
      ctx,
    );

    const expense = {
      id: generateExpenseId(),
      kind: derivedKind,
      amount,
      category,
      userEmotion,
      memo: memo.trim() || undefined,
      sobagiEmotion,
      createdAt,
      // selectedDate is already the chosen local date (YYYY-MM-DD), captured
      // in the device tz at record time — tz-stable from here on.
      localDate: selectedDate,
    };

    const tier = getDialogueTier(recordedDaysCount);
    const savesSinceLastObservation = totalRecordCount - lastObservationSaveCount;
    const observationType = detectObservationType({
      expenses,
      lastVisitDate,
      recordedDaysCount,
      savesSinceLastObservation,
      currentHour: new Date().getHours(),
    });

    const reactionMessage = observationType !== null
      ? selectObservationMessage(observationType)
      : selectReactionMessage(sobagiEmotion, tier, derivedKind);

    // Persist first. Only commit the emotion/observation side effects and
    // navigate if the durability step succeeded — a failed write is rolled
    // back inside saveExpense, so proceeding would show a reaction for a record
    // that won't survive a restart.
    const ok = await saveExpense(expense);
    if (!ok) {
      setSaveError(true);
      setIsSaving(false);
      isSavingRef.current = false;
      return;
    }

    if (observationType !== null) {
      void storageService.save(STORAGE_KEYS.OBSERVATION_SAVE_COUNT, totalRecordCount + 1);
    }
    setEmotion(sobagiEmotion, reactionMessage, derivedKind, selectedDate);
    resetForm();
    navigation.navigate('/reaction');
  };

  return (
    <View style={styles.outer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => navigation.navigate('/')}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>기록하기</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 64 : 80 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
        <Text style={styles.pageSubtitle}>오늘을 기록해요 ✏️</Text>

        {/* Kind toggle — segmented; resets category/amount on switch */}
        <View style={styles.kindToggleRow}>
          <Pressable
            style={[styles.kindToggleChip, recordKind === 'spending' && styles.kindToggleChipSelected]}
            onPress={() => handleToggleKind('spending')}
          >
            <Text style={[styles.kindToggleLabel, recordKind === 'spending' && styles.kindToggleLabelSelected]}>
              쓴 기록
            </Text>
          </Pressable>
          <Pressable
            style={[styles.kindToggleChip, recordKind === 'income' && styles.kindToggleChipSelected]}
            onPress={() => handleToggleKind('income')}
          >
            <Text style={[styles.kindToggleLabel, recordKind === 'income' && styles.kindToggleLabelSelected]}>
              들어온 기록
            </Text>
          </Pressable>
        </View>

        {/* Date selector — horizontally scrollable, max 30 days back, auto-scrolled to today */}
        <ScrollView
          ref={dateScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
          contentContainerStyle={styles.dateRow}
          onContentSizeChange={() => dateScrollRef.current?.scrollToEnd({ animated: false })}
        >
          {dateOptions.map((opt) => {
            const isSelected = opt.dateStr === selectedDate;
            return (
              <Pressable
                key={opt.dateStr}
                style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                onPress={() => setSelectedDate(opt.dateStr)}
              >
                <Text style={[styles.dateChipLabel, isSelected && styles.dateChipLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* No-spend option — visible whenever the selected day has no record
            yet (and isn't a future date). Copy adapts to today vs past. */}
        {canNoSpend && (
          <Pressable
            style={styles.noSpendBtn}
            onPress={handleNoSpend}
            disabled={!canNoSpend}
          >
            <Text style={styles.noSpendLabel}>
              {isSelectedDateToday
                ? '오늘은 무지출이에요 🌿'
                : '이날은 조용히 지나갔어요 🌿'}
            </Text>
          </Pressable>
        )}

        {/* Amount hero */}
        <Pressable style={styles.amountCard} onPress={() => amountInputRef.current?.focus()}>
          <Text style={styles.amountDisplay}>
            {amount > 0 ? `${amount.toLocaleString()}원` : '0원'}
          </Text>
          <TextInput
            ref={amountInputRef}
            style={styles.amountInput}
            value={amountText}
            onChangeText={(t) => setAmountText(formatAmountInput(t))}
            placeholder={recordKind === 'income' ? '금액 (선택)' : '금액을 입력해요'}
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
            maxLength={13}
            onFocus={() => { focusedFieldRef.current = 'amount'; }}
          />
        </Pressable>

        {/* Category */}
        <View style={styles.section}>
          <CategorySelector
            selected={category}
            onSelect={setCategory}
            categories={recordKind === 'income' ? INCOME_CATEGORIES : GENERAL_SPENDING_CATEGORIES}
          />
          <MemoSuggestions
            category={category}
            memo={memo}
            onAppend={setMemo}
          />
        </View>

        {/* User emotion */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>기분은 어때요? (선택)</Text>
          <View style={styles.emotionRow}>
            {USER_EMOTIONS.map((e) => (
              <Pressable
                key={e.emoji}
                style={[styles.emotionChip, userEmotion === e.emoji && styles.emotionChipSelected]}
                onPress={() => setUserEmotion(userEmotion === e.emoji ? undefined : e.emoji)}
              >
                <Text style={styles.emotionEmoji}>{e.emoji}</Text>
                <Text style={[styles.emotionLabel, userEmotion === e.emoji && styles.emotionLabelSelected]}>
                  {e.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Memo */}
        <View
          style={styles.section}
          onLayout={(e) => { memoSectionYRef.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionLabel}>한마디 (선택)</Text>
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="오늘에 대한 한마디..."
            placeholderTextColor={COLORS.textLight}
            maxLength={60}
            multiline
            onFocus={() => { focusedFieldRef.current = 'memo'; }}
          />
        </View>

          {/* Save */}
          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveButtonLabel}>저장하기</Text>
          </Pressable>
          {recordKind === 'spending' && amount === 0 && canNoSpend && (
            <Text style={styles.saveHelper}>
              지출이 없는 날은 무지출 기록을 사용할 수 있어요 🌿
            </Text>
          )}
          {recordKind === 'income' && !incomeHasIntent && (
            <Text style={styles.saveHelper}>
              금액, 메모, 기분 중 하나만 남겨도 충분해요 🌿
            </Text>
          )}
          {saveError && (
            <Text style={styles.saveError}>
              저장이 잘 안 됐어요. 잠시 후 다시 시도해 주세요 🌿
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomTabs activeRoute="/record" />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 8,
    paddingBottom: 4,
    backgroundColor: COLORS.cream,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: COLORS.text,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  dateScroll: {
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 0,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  dateChipSelected: {
    backgroundColor: COLORS.oliveGreen,
  },
  dateChipLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  dateChipLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  kindToggleRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  kindToggleChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  kindToggleChipSelected: {
    backgroundColor: COLORS.oliveGreen,
  },
  kindToggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  kindToggleLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  amountCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noSpendBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  noSpendLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  amountDisplay: {
    fontSize: 44,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  amountInput: {
    fontSize: 14,
    color: COLORS.textMuted,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 12,
    minWidth: 160,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  emotionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  emotionChip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    minWidth: 52,
    gap: 4,
  },
  emotionChipSelected: {
    backgroundColor: COLORS.oliveGreen,
  },
  emotionEmoji: {
    fontSize: 22,
  },
  emotionLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  emotionLabelSelected: {
    color: '#fff',
  },
  memoInput: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: COLORS.oliveDark,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.oliveDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  saveHelper: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  saveError: {
    fontSize: 13,
    color: '#C96A45',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Expense, ExpenseCategory } from '../../types';
import { COLORS } from '../../constants/colors';
import { parseAmountInput, formatAmountInput } from '../../utils/amount';
import { amountValidForKind } from '../../utils/recordValidation';
import { GENERAL_SPENDING_CATEGORIES, INCOME_CATEGORIES, kindForCategory } from '../../constants/categories';
import { updateExpense as persistUpdateExpense, deleteExpense as persistDeleteExpense } from '../../services/expenseService';
import { useAndroidBack } from '../../hooks/useAndroidBack';

interface ExpenseEditSheetProps {
  // The record being edited. `null` keeps the sheet closed (animated off-screen).
  // The sheet owns its own close animation and calls `onClose` only after it has
  // finished sliding out, so the parent must clear its state ONLY via onClose —
  // never set it to null independently, or the sheet would stay visible.
  expense: Expense | null;
  onClose: () => void;
}

// A bottom sheet for editing or deleting a single saved record. Shared by the
// stats calendar and the record screen so both surfaces behave identically.
// Persistence goes through expenseService (update/delete are rolled back in
// memory on failure); on a failed write the sheet stays open with an error so
// the UI never reads as a false success.
export function ExpenseEditSheet({ expense, onClose }: ExpenseEditSheetProps) {
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('cafe');
  const [editMemo, setEditMemo] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editSheetBottom, setEditSheetBottom] = useState(0);
  // In-flight + failure state for edit/delete persistence. `editSaving` guards
  // against double-taps; `editError` keeps the sheet open with a message when a
  // write fails (and was rolled back).
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(false);
  const editSheetAnim = useRef(new Animated.Value(500)).current;
  // Tracks which record the fields are currently primed for, so re-renders
  // while open don't re-initialize the in-progress edit.
  const openedIdRef = useRef<string | null>(null);

  const isOpen = expense !== null;

  const editingExpensePool = useMemo(() => {
    if (!expense) return GENERAL_SPENDING_CATEGORIES;
    return expense.kind === 'income' ? INCOME_CATEGORIES : GENERAL_SPENDING_CATEGORIES;
  }, [expense]);

  // Prime the fields and slide in when a (new) record opens. Keyed on id so the
  // user's in-progress edits aren't wiped by unrelated re-renders.
  useEffect(() => {
    if (expense && expense.id !== openedIdRef.current) {
      openedIdRef.current = expense.id;
      setEditAmount(formatAmountInput(String(expense.amount)));
      setEditCategory(expense.category);
      setEditMemo(expense.memo ?? '');
      setDeleteConfirm(false);
      setEditError(false);
      setEditSaving(false);
      editSheetAnim.setValue(500);
      Animated.spring(editSheetAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 11 }).start();
    }
    if (!expense) {
      openedIdRef.current = null;
    }
  }, [expense, editSheetAnim]);

  useEffect(() => {
    if (!isOpen) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setEditSheetBottom(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setEditSheetBottom(0));
    return () => { show.remove(); hide.remove(); };
  }, [isOpen]);

  const closeEdit = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(editSheetAnim, { toValue: 500, duration: 210, useNativeDriver: true }).start(() => {
      setDeleteConfirm(false);
      setEditSheetBottom(0);
      setEditError(false);
      setEditSaving(false);
      onClose();
    });
  }, [editSheetAnim, onClose]);

  // Single guarded dismiss for every user-initiated close path (backdrop tap,
  // 취소 button, Android back). While a save/delete is in flight the sheet is
  // locked so it can't disappear mid-operation and read as success.
  const dismissEdit = useCallback(() => {
    if (editSaving) return;
    closeEdit();
  }, [editSaving, closeEdit]);

  const commitEdit = useCallback(async () => {
    if (!expense || editSaving) return;
    // Shared parse + validity rule with the create flow: `parseAmountInput`
    // normalizes blanks/junk to 0; income may be 0 (amount optional), spending
    // must be positive.
    const parsed = parseAmountInput(editAmount);
    const nextKind = kindForCategory(editCategory);
    if (!amountValidForKind(nextKind, parsed)) return;
    setEditSaving(true);
    setEditError(false);
    const ok = await persistUpdateExpense(expense.id, {
      amount: parsed,
      category: editCategory,
      memo: editMemo.trim() || undefined,
      kind: nextKind,
    });
    setEditSaving(false);
    if (!ok) {
      setEditError(true);
      return;
    }
    closeEdit();
  }, [expense, editSaving, editAmount, editCategory, editMemo, closeEdit]);

  // Mirror of commitEdit's validity gate, for the save button's enabled state.
  const editKind = kindForCategory(editCategory);
  const editCanSave = amountValidForKind(editKind, parseAmountInput(editAmount));

  // No-spend records have nothing meaningful to edit (amount 0, fixed category).
  // The sheet collapses to a quiet label + delete-only affordance for them.
  const editingNoSpend = expense?.category === 'no_spend';

  const commitDelete = useCallback(async () => {
    if (!expense || editSaving) return;
    setEditSaving(true);
    setEditError(false);
    const ok = await persistDeleteExpense(expense.id);
    setEditSaving(false);
    if (!ok) {
      setEditError(true);
      return;
    }
    closeEdit();
  }, [expense, editSaving, closeEdit]);

  useAndroidBack(isOpen, dismissEdit);

  // Bound the sheet's body so it never overflows past the top of the available
  // space (screen height minus the keyboard inset). The inner ScrollView grows
  // with content and only starts scrolling once it would exceed this height, so
  // on normal devices the sheet looks identical (no scroll) while small screens
  // + open keyboard + wrapped chips stay fully reachable. The ~72px reserve
  // leaves a gap below the status bar.
  const { height: windowHeight } = useWindowDimensions();
  const scrollMaxHeight = Math.max(windowHeight - editSheetBottom - 72, 200);

  return (
    <>
      {isOpen && <Pressable style={styles.editBackdrop} onPress={dismissEdit} />}

      <Animated.View
        style={[styles.editSheet, { transform: [{ translateY: editSheetAnim }], bottom: editSheetBottom }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <ScrollView
          style={{ maxHeight: scrollMaxHeight }}
          contentContainerStyle={styles.editScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
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

            {isOpen && !editCanSave && (
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
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  editBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    // Dim a touch more than the original 0.08 so the busy record-screen form
    // behind the sheet recedes; still light enough for the calm stats calendar.
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  // The card chrome (bg, rounded top, shadow) stays on the Animated.View so the
  // slide animation and shadow are unchanged. Padding moved to the inner
  // ScrollView's content container so the body can scroll within the card.
  editScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  editSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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

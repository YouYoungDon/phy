# HomeScreen Atmosphere Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Sobagi's HomeScreen feel like a single inhabited room rather than a background image with UI overlays placed on top.

**Architecture:** All five changes are confined to `src/pages/index.tsx`. No new files, components, or dependencies. Changes are pure style adjustments and minor JSX additions. Each task produces a committed state that is visually coherent on its own.

**Tech Stack:** React Native 0.84, TypeScript, Zustand, Granite SDK. No LinearGradient library available — gradient effects are achieved via stacked Views with increasing opacity.

**Spec:** `docs/superpowers/specs/2026-05-16-homescreen-atmosphere-polish-design.md`

---

## File Map

| File | Role in this pass |
|------|-------------------|
| `src/pages/index.tsx` | Only file modified — all JSX and StyleSheet changes |

No new files. No other files touched.

---

## Note on Testing

These are pure visual/style changes. There are no logic behaviors to unit-test. After each task: run `npm test` to confirm the existing 26 tests still pass. TypeScript changes in Task 1 require `npm run typecheck`. Visual verification is done by inspecting the app in the Granite dev server (`npm run dev`).

---

## Task 1: Remove Closet Icon

Removes the dead-end interaction. The closet placeholder breaks trust — removing the entry point is better than showing a stub.

**Files:**
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Remove `'closet'` from `SheetType`**

In `src/pages/index.tsx`, find this line (around line 111):

```typescript
type SheetType = 'mailbox' | 'bag' | 'closet';
```

Replace with:

```typescript
type SheetType = 'mailbox' | 'bag';
```

- [ ] **Step 2: Remove the closet TouchableOpacity from JSX**

Find and delete this block (around line 233–235):

```jsx
<TouchableOpacity style={styles.propCloset} onPress={() => openSheet('closet')} activeOpacity={0.7}>
  <Text style={styles.propIcon}>🚪</Text>
</TouchableOpacity>
```

- [ ] **Step 3: Remove the closet sheet content block from JSX**

Find and delete this block (around line 389–398):

```jsx
{activeSheet === 'closet' && (
  <View>
    <Text style={styles.sheetTitle}>옷장</Text>
    <Text style={styles.sheetBody}>지금은 초록 스카프를 두르고 있어요.</Text>
    <Text style={styles.sheetMuted}>
      {'다음엔 어떤 색이 좋을까요?\n\n옷장은 천천히 채워지는 중이에요 🧣'}
    </Text>
  </View>
)}
```

- [ ] **Step 4: Remove the `propCloset` style from StyleSheet**

Find and delete this style entry (around line 475–480):

```javascript
propCloset: {
  position: 'absolute',
  top: '42%',
  left: 14,
  padding: 8,
},
```

- [ ] **Step 5: Run typecheck to confirm no remaining `'closet'` references**

```
npm run typecheck
```

Expected: no errors. If TypeScript complains about `'closet'` being used somewhere, find and remove that reference too.

- [ ] **Step 6: Run existing tests**

```
npm test
```

Expected: 3 suites, 26 tests, all passing.

- [ ] **Step 7: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "fix: remove closet icon until content is ready"
```

---

## Task 2: Warm the Level Chip

Shifts the level chip from cold neutral HUD to warm room-palette element.

**Files:**
- Modify: `src/pages/index.tsx` (StyleSheet only)

- [ ] **Step 1: Change `levelCard` background color**

In the `StyleSheet.create({...})` block, find:

```javascript
levelCard: {
  backgroundColor: 'rgba(0,0,0,0.32)',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 16,
  gap: 7,
  minWidth: 160,
},
```

Change `backgroundColor` only:

```javascript
levelCard: {
  backgroundColor: 'rgba(61,48,32,0.42)',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 16,
  gap: 7,
  minWidth: 160,
},
```

- [ ] **Step 2: Warm the progress track color**

Find:

```javascript
progressTrack: {
  height: 4,
  borderRadius: 2,
  backgroundColor: 'rgba(255,255,255,0.2)',
  overflow: 'hidden',
},
```

Change `backgroundColor` only:

```javascript
progressTrack: {
  height: 4,
  borderRadius: 2,
  backgroundColor: 'rgba(250,246,238,0.25)',
  overflow: 'hidden',
},
```

- [ ] **Step 3: Run tests**

```
npm test
```

Expected: 3 suites, 26 tests, all passing.

- [ ] **Step 4: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "fix: warm level chip color to match room palette"
```

---

## Task 3: Add Sobagi Contact Shadow

Grounds Sobagi on the room floor. The shadow stays fixed while the float animation moves the character above it, creating the sense of standing in the room.

**Files:**
- Modify: `src/pages/index.tsx` (JSX + StyleSheet)

- [ ] **Step 1: Add shadow View inside `characterArea`**

Find the characterArea block (around line 241–246):

```jsx
<TouchableOpacity style={styles.characterArea} onPress={handleSobagiTap} activeOpacity={1}>
  <View style={styles.bubbleContainer} pointerEvents="none">
    <EmotionBubble message={bubbleMessage} visible={bubbleVisible} />
  </View>
  <SobagiCharacter emotion={currentEmotion} size="large" imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />
</TouchableOpacity>
```

Add `<View style={styles.sobagiShadow} />` after `SobagiCharacter`:

```jsx
<TouchableOpacity style={styles.characterArea} onPress={handleSobagiTap} activeOpacity={1}>
  <View style={styles.bubbleContainer} pointerEvents="none">
    <EmotionBubble message={bubbleMessage} visible={bubbleVisible} />
  </View>
  <SobagiCharacter emotion={currentEmotion} size="large" imageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI} />
  <View style={styles.sobagiShadow} />
</TouchableOpacity>
```

`characterArea` uses `justifyContent: 'flex-end'`, so children align from the bottom of the area upward. The shadow View (last in JSX) sits at the very bottom, with SobagiCharacter just above it — which is the correct physical arrangement.

- [ ] **Step 2: Add `sobagiShadow` to StyleSheet**

Add this entry to `StyleSheet.create({...})`:

```javascript
sobagiShadow: {
  width: 64,
  height: 8,
  borderRadius: 32,
  backgroundColor: 'rgba(61,48,32,0.15)',
  alignSelf: 'center',
},
```

- [ ] **Step 3: Run tests**

```
npm test
```

Expected: 3 suites, 26 tests, all passing.

- [ ] **Step 4: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "fix: add contact shadow under sobagi to ground in room"
```

---

## Task 4: Differentiate Prop Visual Weight

Mailbox (wall, far) recedes; bag (floor, near) becomes slightly more present. Neither should read as a button or CTA.

**Files:**
- Modify: `src/pages/index.tsx` (JSX + StyleSheet)

- [ ] **Step 1: Split `propIcon` into two specific styles in StyleSheet**

Find the current shared style:

```javascript
propIcon: {
  fontSize: 28,
  opacity: 0.82,
},
```

Replace it with two separate styles. Also add the bag ground shadow:

```javascript
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
```

- [ ] **Step 2: Update mailbox JSX to use `propIconMailbox`**

Find:

```jsx
<TouchableOpacity style={styles.propMailbox} onPress={() => openSheet('mailbox')} activeOpacity={0.7}>
  <Text style={styles.propIcon}>📬</Text>
  {mailboxUnread && (
    <View style={styles.propBadge}>
      <Text style={styles.propBadgeText}>!</Text>
    </View>
  )}
</TouchableOpacity>
```

Change `styles.propIcon` → `styles.propIconMailbox`:

```jsx
<TouchableOpacity style={styles.propMailbox} onPress={() => openSheet('mailbox')} activeOpacity={0.7}>
  <Text style={styles.propIconMailbox}>📬</Text>
  {mailboxUnread && (
    <View style={styles.propBadge}>
      <Text style={styles.propBadgeText}>!</Text>
    </View>
  )}
</TouchableOpacity>
```

- [ ] **Step 3: Update bag JSX to use `propIconBag` and add ground shadow**

Find:

```jsx
<TouchableOpacity style={styles.propBag} onPress={() => openSheet('bag')} activeOpacity={0.7}>
  <Text style={styles.propIcon}>🎒</Text>
  {pendingNewItemId !== null && <View style={styles.bagDot} />}
</TouchableOpacity>
```

Change `styles.propIcon` → `styles.propIconBag`, add `propBagShadow` View:

```jsx
<TouchableOpacity style={styles.propBag} onPress={() => openSheet('bag')} activeOpacity={0.7}>
  <Text style={styles.propIconBag}>🎒</Text>
  <View style={styles.propBagShadow} />
  {pendingNewItemId !== null && <View style={styles.bagDot} />}
</TouchableOpacity>
```

- [ ] **Step 4: Run typecheck to confirm no stale `propIcon` references**

```
npm run typecheck
```

Expected: no errors. If TypeScript complains about `propIcon` being used elsewhere, update those references too.

- [ ] **Step 5: Run tests**

```
npm test
```

Expected: 3 suites, 26 tests, all passing.

- [ ] **Step 6: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "fix: differentiate prop visual weight by room depth"
```

---

## Task 5: Dissolve summaryCard Boundary

Removes the hard 1px border and replaces it with a soft stacked fade so the room flows into the card without a visible cut.

**Files:**
- Modify: `src/pages/index.tsx` (JSX + StyleSheet)

- [ ] **Step 1: Remove the border from `summaryCard`**

Find:

```javascript
summaryCard: {
  backgroundColor: COLORS.card,
  borderTopWidth: 1,
  borderTopColor: COLORS.border,
},
```

Remove the two border lines:

```javascript
summaryCard: {
  backgroundColor: COLORS.card,
},
```

- [ ] **Step 2: Add `bottomFade` overlay to JSX**

The fade overlay goes inside the `<RoomBackground>` children block, **before** the header and prop elements, so it renders behind them in z-order (first in JSX = lowest in stack).

Find the opening of the RoomBackground children:

```jsx
<RoomBackground stage={roomStage} backgroundUri={ROOM_BACKGROUND_URIS[roomStage] ?? ROOM_BACKGROUND_URIS[1]}>
  <View style={styles.header}>
```

Insert the bottomFade block immediately after the `<RoomBackground ...>` opening tag, before `<View style={styles.header}>`:

```jsx
<RoomBackground stage={roomStage} backgroundUri={ROOM_BACKGROUND_URIS[roomStage] ?? ROOM_BACKGROUND_URIS[1]}>
  <View style={styles.bottomFade} pointerEvents="none">
    <View style={[styles.fadeSlice, { opacity: 0.06 }]} />
    <View style={[styles.fadeSlice, { opacity: 0.18 }]} />
    <View style={[styles.fadeSlice, { opacity: 0.38 }]} />
    <View style={[styles.fadeSlice, { opacity: 0.60 }]} />
    <View style={[styles.fadeSlice, { opacity: 0.82 }]} />
  </View>
  <View style={styles.header}>
```

`pointerEvents="none"` ensures the fade zone does not intercept any touches. All props and character touches remain functional.

- [ ] **Step 3: Add `bottomFade` and `fadeSlice` to StyleSheet**

Add these two entries to `StyleSheet.create({...})`:

```javascript
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
```

- [ ] **Step 4: Visual check — confirm no visible band**

Run the dev server:

```
npm run dev
```

Open the app in the Granite dev environment and go to the HomeScreen. Check:
- The room image dissolves smoothly into the summaryCard. No visible stripe or band.
- The summaryCard has no hard top border.
- Props and Sobagi remain fully tappable.

If the topmost fade slice (opacity 0.06) reads as a visible line, reduce it to 0.03. If the dissolve looks too abrupt at the bottom, try increasing the 5th slice to 0.88.

- [ ] **Step 5: Run tests**

```
npm test
```

Expected: 3 suites, 26 tests, all passing.

- [ ] **Step 6: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "fix: dissolve summaryCard boundary into room atmosphere"
```

---

## Final Visual Verification Checklist

After all five tasks are committed, do a holistic check in the dev server:

- [ ] Room flows into summaryCard without a visible cut
- [ ] Sobagi's float animation feels grounded (shadow stays fixed while character moves)
- [ ] Level chip reads as warm and room-integrated, not as a game HUD
- [ ] Removing the closet icon makes the room feel less cluttered, not emptier
- [ ] Mailbox feels slightly receded (wall); bag feels slightly closer (floor) — neither reads as a primary CTA
- [ ] All props remain tappable
- [ ] Bag dot notification still appears correctly when `pendingNewItemId` is set
- [ ] Mailbox unread badge still appears correctly

---

## Self-Review Notes

**Spec coverage:**
- ✅ summaryCard boundary dissolve (Task 5)
- ✅ Level chip warmth (Task 2)
- ✅ Sobagi contact shadow (Task 3)
- ✅ Closet icon removal (Task 1)
- ✅ Prop depth differentiation with separate styles (Task 4)
- ✅ Bag ground shadow (Task 4)
- ✅ `pointerEvents="none"` on bottomFade (Task 5, Step 2)
- ✅ No reward language, unlock framing, or attention-grabbing animation introduced

**Type consistency:**
- `sobagiShadow` defined in Task 3, used in Task 3 ✅
- `propIconMailbox`, `propIconBag`, `propBagShadow` defined and used in Task 4 ✅
- `bottomFade`, `fadeSlice` defined and used in Task 5 ✅
- Old `propIcon` style removed in Task 4, no remaining references ✅
- `'closet'` removed from `SheetType` in Task 1, all call sites removed ✅
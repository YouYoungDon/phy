# 소박이 Known Issues

## Category: SDK / Type Noise (Non-Blocking)

### KI-001 · `_404.tsx` TypeScript Errors

**Status:** Non-blocking, pre-existing  
**Severity:** Dev noise only — no user impact  
**Files:** `src/pages/_404.tsx`

Granite SDK does not expose `/_404` as a valid key in `RegisterScreenInput`, causing two TS errors on `createRoute('/_404', ...)`. The fallback screen renders correctly at runtime. Fix requires SDK-level support or suppressing with `// @ts-ignore`.

---

## Category: Visual / UX (Low Priority)

### KI-002 · White Flash on Navigation (Mitigated)

**Status:** Mitigated, not fully eliminated  
**Severity:** Low — barely perceptible  
**Files:** `src/_app.tsx`

AppContainer now uses a cream `backgroundColor` which reduces white flash significantly. Residual flash may appear on very first navigation depending on device GPU compositing. Full elimination requires Granite navigator `cardStyle` config (not yet exposed in SDK).

### KI-003 · Room Background View-Based (No Final Art)

**Status:** Intentional for MVP, not a bug  
**Severity:** Low — functional but not polished  
**Files:** `src/components/room/RoomBackground.tsx`

Room is rendered with React Native `View` elements (wall, floor, window, emojis). Final production art (illustrated background) is deferred. Stage progression (1–5) is functional with emoji props at appropriate thresholds.

### KI-004 · Sobagi Character View-Based (No Final Art)

**Status:** Intentional for MVP  
**Severity:** Low  
**Files:** `src/components/sobagi/SobagiEmotionFace.tsx`

Sobagi's face is rendered with React Native `View` border tricks (arc mouths, oval eyes). Visual is consistent and emotionally clear across all 5 emotions. Final illustrated assets deferred to post-MVP.

---

## Category: Persistence / Data

### KI-005 · Streak Not Validated on Hydrate

**Status:** Low priority edge case  
**Severity:** Low — affects only multi-day gap scenario  
**Files:** `src/hooks/useAppInit.ts`, `src/services/expenseService.ts`

Streak is stored and restored as a raw number. If the user skips 2+ days, the stored streak remains stale until a new record is saved (which resets it to 1). No auto-correction on app open. Acceptable for MVP — first record after a gap corrects the streak.

---

## Category: Out of Scope (Not Issues)

- No marble/orb economy — reward card removed from reaction screen
- No quest / mission system
- No onboarding — app opens directly to HomeScreen
- `_404.tsx` route fallback exists but unreachable in normal flow

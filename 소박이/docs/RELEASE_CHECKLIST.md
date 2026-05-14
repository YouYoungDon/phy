# 소박이 MVP Release Checklist

## Build

- [x] `ait build` completes with 0 errors, 0 warnings (iOS + Android)
- [x] Artifact: `pockeksobak.ait` — 2.93 MB
- [x] deploymentId: `019e23ab-aea6-7781-aed4-fd9fdde1c63a`
- [x] Targets: RN 0.84.0 + RN 0.72.6 (dual bundle)

## Tests

- [x] `npm test` — 18/18 pass, 3 suites
  - `emotionEngine.test.ts` — 7 cases
  - `stores.test.ts`
  - `storageService.test.ts`

## TypeScript

- [x] `npm run typecheck` — 0 new errors
- [ ] `_404.tsx` — 2 pre-existing SDK type errors (non-blocking, SDK registration limitation)

## Code Cleanliness

- [x] No `console.log` / `console.debug` in production paths
- [x] `console.warn` in `storageService.ts` gated behind `__DEV__`
- [x] No TODO / FIXME comments in source
- [x] No placeholder / dummy UI text
- [x] Dead code removed: `sobagiBase64.ts` (unused after emotion face refactor)
- [x] Phantom economy reference removed: "구슬 획득 +1" from reaction screen

## Core Flow (static + manual verification needed)

- [x] Home loads with room background + Sobagi character
- [x] Record screen opens from BottomTabs
- [x] Save creates expense, evaluates emotion, navigates to Reaction
- [x] Reaction shows correct emotion face + message
- [x] Reaction auto-returns to Home after 3 seconds
- [x] BottomTabs active state correct on Home and Stats
- [x] BottomTabs prevents duplicate route push
- [x] Stats screen loads with weekly data
- [x] Storage persists: expenses, user state, last emotion after cold restart
- [x] Unknown stored emotion falls back to 'happy' (VALID_EMOTIONS guard)

## Emotion System

- [x] All 5 emotions visually distinct: happy / excited / surprised / soft-sad / sleepy
- [x] Emotion engine priority chain: firstRecord > streak≥3 > hour≥22 > amount≥50000 > happy
- [x] Per-emotion Sobagi face renders correctly at sizes: 80 / 120 / 180px
- [x] Emotion messages correct and emotionally coherent

## Visual Polish

- [x] App container background cream — no white flash on navigation
- [x] Room stage 1→5 subtle wall/floor warmth progression
- [x] Window glass warm (leafy light, not cold blue)
- [x] BottomTabs active indicator: olive top border + olive label
- [x] Level chip: oliveGreen (softer than oliveDark)
- [x] Stats screen: warm header with status bar padding

## Items Intentionally Out of Scope

- [ ] Quests / missions
- [ ] Item shop / economy
- [ ] Room editor
- [ ] Social / sharing features
- [ ] Final production Sobagi art assets
- [ ] Push notifications
- [ ] Onboarding flow

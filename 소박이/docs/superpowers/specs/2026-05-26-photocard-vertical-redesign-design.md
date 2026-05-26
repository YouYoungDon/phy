# Photocard Vertical Redesign — Design

**Date:** 2026-05-26
**Status:** Approved direction; pending spec review → plan.

## Goal

The photocard is too small. Restack it from a **landscape left/right split** into a **vertical card**: a big Sobagi mood scene on top, the day's record below. Keep it a *warm snapshot of the day* — not a finance dashboard.

## Context — what the photocard is today

`src/components/photocard/PhotocardView.tsx` renders a fixed-size **landscape 3:2 card** (`CARD_WIDTH = SCREEN_WIDTH - 48`, `CARD_HEIGHT = CARD_WIDTH * 0.667`) split into:
- **Left panel (~46%):** the mood asset (`pothocard_*.png`), filled via `cover`. A tiny time badge sits top-right.
- **Right panel (~54%):** date header → records grouped by kind (`쓴 기록 / 들어온 기록 / 무지출`, rendered as **records, not totals**) → a `🌱 오늘의 한 줄` quote block.

The aggregate **total block was deliberately removed** (sub-spec B) — "the Sobagi quote carries the emotional weight instead."

It is rendered identically in two places, both as a full-screen dark "develop" modal with a reveal animation and a `✕` close hint:
- `src/pages/reaction.tsx` (after a save, via the `포토카드 생성` button)
- `src/pages/stats.tsx` (the per-day photocard entry)

So this is **one component change** that propagates to both hosts.

The mood asset is chosen by `getPhotocardMoodAsset(hour, weather, emotion, spendingLevel)` in `src/services/photocardMoodService.ts` — one of 10 assets (`PHOTOCARD_MOOD_URIS` in `src/constants/assets.ts`). **Confirmed asset dimensions:** all are **~9:16 portrait** (`pothocard_2.png` = 247×440, room bg = 941×1672).

## Philosophy guardrails (binding — locked decisions)

This redesign is **scene-centered**. The bottom shows *the day's scenes*, never a ledger. Specifically **NOT** built:
- No income **total** headline (e.g. "들어온 돈 120,000원"). Income totals are banned except the two scoped Stats places (monthly settlement line + 함께 보기 cell). Income stays as **observational `들어온 기록` records**.
- No income **itemization** / "5월 수입" / 금여·보너스 breakdown (`수입` is banned vocabulary).
- No **category→amount spending table** (카페/식비/교통…). That is the "spent X on Y" financial taxonomy rejected by `feedback_sobagi_categories_life_scenes`.
- No **monthly finance drill-down screens** — "finance dashboard summaries" is in the Explicitly Rejected list in `SOBAGI_CURRENT_STATE.md`.

The existing content (grouped records + quote, no totals) already satisfies this. A daily **쓴 돈** total would be permitted (spending totals exist in `DailySummary`), but we are **not** adding one — the records-only treatment is preserved by choice.

## The redesign

### Layout: `row` → `column`

```
┌───────────────────────────────┐  card (rounded 14, overflow hidden, paper bg)
│                               │
│   [ mood scene — landscape ]  │  TOP image: full card width, ~3:2, cover.
│                               │       time badge stays top-right.
├───────────────────────────────┤
│  오늘의 기록        2025.05.24 │  date header (date + weekday · 오늘의 기록)
│  ───────────────────────────  │
│  쓴 기록                       │  records grouped by kind (UNCHANGED logic):
│   ☕ 카페 · 메모      ₩ 4,500 │   groupByKind → take(VISIBLE_RECORDS) →
│  들어온 기록                   │   renderRecordRow → showsAmount.
│   💼 용돈 받음                │   (income observational; no total)
│  🌿 무지출 · 조용히 지나간 날   │
│  + N개 더                      │  overflow line, if any
│  ───────────────────────────  │
│  🌱 오늘의 한 줄               │  Sobagi quote block (note block)
│  "요즘 카페에 자주 들렀네요" ☕ │
└───────────────────────────────┘
```

### Dimensions

- `CARD_WIDTH = SCREEN_WIDTH - 48` (unchanged width).
- **Top image:** full width, height = `CARD_WIDTH * TOP_ASPECT`. `TOP_ASPECT = 0.667` (3:2 landscape banner). Parameterize as a single constant so it's a one-line adjustment.
- **Bottom block:** intrinsic height (header + records + quote), with comfortable padding.
- `CARD_HEIGHT` is **no longer a fixed 0.667 ratio**; the card becomes portrait-ish (`top image height + bottom content height`), bounded to fit the modal (≈ `SCREEN_WIDTH-48` wide × ~480 tall on a 375pt phone). Both modal hosts center the card and already comment "PhotocardView provides its own fixed dimensions" — that stays true; the dimensions just change.

### Content (preserved, with one tunable)

`groupByKind`, the `take`/`VISIBLE_RECORDS` cap, `renderRecordRow`, `showsAmount`, overflow count, and the quote logic are **kept as-is** — only re-laid-out vertically.
- `VISIBLE_RECORDS`: **3 → 4** (the vertical card has more room). Tunable single constant; existing grouping tests still cover the take/overflow behavior at any cap.

### Assets — 10 new landscape scenes (user-produced)

Portrait assets crop Sobagi out of a wide banner, so produce **10 landscape PNGs, ~3:2 (suggested 1200×800)**, one per mood slot. Mapping (from `getPhotocardMoodAsset`, unchanged):

| asset | scene |
|---|---|
| `photocard_1` | early morning (5–9시) |
| `photocard_8` | late morning (9–12) |
| `photocard_10` | early afternoon (12–15) |
| `photocard_7` | mid-afternoon (15–18) |
| `photocard_4` | evening (18–21) |
| `photocard_5` | late night / sleepy (21–5) |
| `photocard_2` | happy midday (11–16) · FALLBACK |
| `photocard_6` | rainy |
| `photocard_3` | excited |
| `photocard_9` | soft-sad |

On upload, bump the CDN pin in `src/constants/assets.ts` (per-SHA cache). No resolver/logic change.

### Stays identical

`getPhotocardMoodAsset` resolver; both modal hosts (`reaction.tsx`, `stats.tsx`); the develop/reveal animation and `✕` close; the quote fade-in; `photocardGrouping.ts`.

## Explicitly out of scope

- **📷 camera/capture/share button.** There is no camera button today (the mockup's "keep it" is a misread — the modal only has `✕`). Capturing the card as an image + share is a separate feature (view-capture + share plumbing) and is **not** part of this layout pass. Tracked as a possible follow-up.
- All financial drill-down/detail screens (see guardrails).

## Files touched

- **Modify:** `src/components/photocard/PhotocardView.tsx` — container `row`→`column`, new styles, `TOP_ASPECT` constant, `CARD_HEIGHT` derivation, `VISIBLE_RECORDS` 3→4. Legacy unused props (`backgroundUri`, `roomStage`, etc.) untouched.
- **Modify (when assets land):** `src/constants/assets.ts` — CDN pin bump to the new landscape uploads.
- **No change:** `photocardMoodService.ts`, `photocardGrouping.ts`, `reaction.tsx`, `stats.tsx`.

## Testing

The change is presentational (no new pure logic). `photocardGrouping` tests stay green and still cover grouping/overflow at the new `VISIBLE_RECORDS`. Verification: `tsc --noEmit` clean + full Jest green + manual visual check in both hosts (reaction modal, stats per-day) with mixed/income-only/no-spend days.

## Asset dependency / rollout

The vertical **layout** can be implemented immediately; it will only *look* right once the 10 landscape assets land (a portrait asset in a 3:2 banner crops top/bottom). Recommended sequencing: implement the layout (parameterized `TOP_ASPECT`), the user produces the 10 landscape assets in parallel, then bump the CDN pin. Until then the banner shows a cropped band of the current portrait asset — acceptable on the dev branch, corrected by the pin bump.

# Sobagi — Long-Term Emotional Progression Design
**Date:** 2026-05-16
**Branch:** apps-in-toss-clean
**Status:** Approved design, ready for implementation planning

---

## 1. Guiding Philosophy

Sobagi's long-term progression should answer one question:

> "How does a user returning after 30 days feel that time passed here — without being told that it did?"

The answer is not achievements, not level announcements, not unlocked furniture. The answer is **atmosphere, familiarity, and quiet accumulation** — all of which change between visits, never during one.

**The governing rule for every system in this document:**
- Changes happen between sessions, not during them
- Nothing is announced
- Nothing is reversed
- The user notices in retrospect, never in the moment

**The test for every new element:**
> After 90 days, does the room feel like *time passed here* — or does it feel like *I leveled up my base*?

If it feels like the second: reject it.

---

## 2. Three Anchor Points

The progression arc has three quiet threshold crossings where multiple systems shift slightly at once. None are celebrated, announced, or visible as moments. The user notices the cumulative effect, not the crossing.

| Anchor | Threshold | What the user experiences |
|--------|-----------|---------------------------|
| **First week together** | `recordedDaysCount ≥ 7` | Room feels slightly warmer. Sobagi's tone softens. A letter appears quietly. |
| **Around one month** | `recordedDaysCount ≥ 30` | Room noticeably different from day 1 (only in contrast). Dialogue fully familiar. Second letter. Room stage 2 activates *if the asset exists.* |
| **A long while later** | `recordedDaysCount ≥ 90` | Room is warm and unmistakably familiar. Deepest dialogue tier. Third personal letter — reflective, not celebratory. |

**Between anchors:** all systems drift continuously at low intensity. The anchors are not "checkpoints" — they are threshold crossings where multiple slow drifts reach a visible accumulation.

**What is never shown to the user:** the numbers 7, 30, 90. Internally they are thresholds. Externally they are "first week together," "around one month," "a long while later."

---

## 3. Atmosphere System

Two independent color overlay layers stacked on the room background. Both are `pointerEvents="none"` Views. No new assets required.

### Layer A — Time-of-Day Tint

Changes every hour based on device clock. Five zones:

| Zone | Hours | Color | Opacity | Emotional register |
|------|-------|-------|---------|-------------------|
| 새벽 Dawn | 05:00–07:00 | `#C8D4E8` | 0.07 | Still, world hasn't started |
| 아침 Morning | 07:00–12:00 | none | 0.00 | Baseline, honest |
| 오후 Afternoon | 12:00–17:00 | `#F5E8C0` | 0.08 | Soft golden warmth |
| 저녁 Evening | 17:00–21:00 | `#E8C070` | 0.09 | Amber, most inhabited feeling |
| 밤 Night | 21:00–05:00 | `#2A3048` | 0.10 | Deep, settled, private |

Transitions are instant on app open — not animated. The room is always in the zone of the current hour.

### Layer B — Warmth Drift

A slow warm amber overlay (`#E8C070`) whose opacity increases with `recordedDaysCount`. Imperceptible day-to-day. Unmistakable across months.

| Days | Warmth opacity | What it feels like |
|------|---------------|-------------------|
| 0 | 0.000 | Baseline, neutral |
| 7 | 0.020 | Barely perceptible |
| 30 | 0.040 | Warm — a new user would think this is just the room's color |
| 90 | 0.060 | Unmistakably lived-in |

The table values above are design targets. The exact curve (linear vs. eased) is for implementation to tune — the emotional target is that the change is imperceptible day-to-day but unmistakable across months.

Both layers stack. The combined effect at Day 90 / evening hour is the room at its warmest. At Day 1 / morning it is its most neutral.

---

## 4. Dialogue System

Two independent layers. The foundation is always present. Observations appear as texture.

### Layer 1 — Time-Based Warmth (Foundation)

Three tiers, advancing at `recordedDaysCount` thresholds. Tone shifts, not vocabulary.

| Tier | Threshold | Register | Sample lines |
|------|-----------|----------|-------------|
| 처음 | Day 0–6 | Gentle, slightly formal | "조용히 기록해뒀어요 🌿" / "오늘도 다녀왔네요 🌿" |
| 익숙함 | Day 7–29 | Familiar, formality dropped | "또 왔네요. 반가워요 🍃" / "따뜻한 하루 같았어요" |
| 오랜 친구 | Day 30+ | Old friend, references shared time | "오랜만이에요. 잘 지내셨어요? 🌿" / "이 방이 좀 달라진 것 같지 않아요?" |

Each tier has a pool of 3–5 messages per emotion context (replaces the current 5 fixed EMOTION_MESSAGES). No-consecutive-repeat guard remains.

### Layer 2 — Soft Observation (Texture)

Appears approximately 1 in 5 saves, only after Day 7. A minimum 4-save cooldown (counted from the last observation) prevents consecutive appearances. Fires as the reaction message for the next qualifying save — replacing the standard emotion-based message, never stacking on top of it.

| Trigger | Condition | Sample lines |
|---------|-----------|-------------|
| Time-of-day rhythm | ≥ 3 records in same time zone in past 7 days | "이 시간에 자주 오네요." / "요즘 밤에 자주 들르네요." |
| Category warmth | café or food dominant in past 10 records | "따뜻한 걸 자주 찾게 되는 날인가 봐요." / "요즘 카페에 자주 가시나 봐요 ☕" |
| Return after gap | ≥ 5 day gap since last record | "조용한 기록들이 조금씩 쌓이고 있어요." / "가끔씩 들러도, 다 기억하고 있어요 🌿" |
| Quiet days | fewer than 3 records in past 7 days | "잠잠한 날들이 이어지고 있네요." / "조용한 한 주였네요 🍃" |

**Hard constraints on Layer 2:**
- Never mention amounts, totals, or financial comparisons
- Never imply a pattern is good or bad
- Never available before Day 7
- 4-save minimum cooldown between observations
- Sobagi observes the *shape* of the user's days — not their financial behavior

The distinction that governs every line:
> **GOOD:** "이 시간에 자주 오네요." (behavioral texture)
> **BAD:** "이번 주 커피 소비가 늘었어요." (financial analytics wearing a costume)

---

## 5. Mailbox System

Two streams. Together: ~7–8 letters in a full year. The mailbox is a quiet archive — never a feed, never a notification surface.

### Stream 1 — Personal Letters (from Sobagi)

Triggered at anchor thresholds. About the shared relationship. Intimate, not celebratory. Written in Sobagi's voice — soft, observational, never proud.

| Letter | Trigger | Tone | Sample content |
|--------|---------|------|---------------|
| Welcome | First record ever | Warm introduction | "안녕하세요. 처음 오셨군요. 이 방은 조용한 곳이에요. 작은 것들을 여기에 두고 가셔도 돼요. 소박이가 잘 보관할게요 🌿" |
| First week | Day 7 anchor | Quiet acknowledgment | "벌써 일주일이 됐네요. 짧은 것 같지만, 꽤 많은 날들을 함께 보냈어요. 앞으로도 가끔씩 들러주세요 🍃" |
| One month | Day 30 anchor | Reflective | "한 달이 됐어요. 이 방도 조금씩 달라지고 있는 것 같아요. 잘 모르겠지만요. 그냥 — 고마워요 🌿" |
| Long while | Day 90 anchor | Deep familiarity | "세 달이 넘었네요. 이 방에 시간이 쌓인 것 같아요. 처음이랑은 좀 다른 것 같기도 하고요. 계속 이렇게 지내도 될 것 같아요 🌿" |

### Stream 2 — World Letters (Seasonal)

Triggered by real calendar date. Arrive on first app open after trigger date. About the world, not the user. Same letter for all users at the same time.

| Letter | Calendar trigger | Tone | Sample content |
|--------|-----------------|------|---------------|
| Spring | Early March | Ambient, sensory | "창문 너머로 꽃잎이 날리고 있어요. 봄이 오면 항상 이 냄새가 나는 것 같아요. 오늘 하루도 어딘가에 남겨두세요 🌸" |
| Rainy season | Late June | Soft, quiet | "비가 오는 날엔 어쩐지 더 조용해지는 것 같아요. 젖은 신발 냄새가 나는 날도 기록해둬요 🌧️" |
| Autumn | Mid October | Sensory warmth | "낙엽이 지기 시작했어요. 가을엔 어쩐지 따뜻한 게 자꾸 생각나요. 오늘 마신 것도 여기 두고 가세요 ☕" |
| Year end | Late December | Reflective | "올해도 거의 다 갔네요. 이 방에 남겨진 것들을 가끔 꺼내 봐요. 작은 것들도 다 기억되고 있어요 🌿" |

### Arrival mechanics

- Letters appear on next app open after the trigger condition is met
- No popup, no badge count — only the soft amber dot on the mailbox icon
- Personal and world letters appear in the same list, unlabeled
- Letters accumulate as a quiet archive — they are never removed
- A user starting in December still receives the year-end letter regardless of `recordedDaysCount`
- Designed to average no more than one letter arrival per month — scarcity is part of the emotional value

**The governing distinction:**
> Sobagi letters = "our relationship has changed."
> World letters = "the world around the room has changed."

---

## 6. Object Accumulation

Three layers. Secondary to atmosphere. All objects follow the Discovery Principle.

### The Discovery Principle

- Changes happen between sessions, not during them
- Nothing is announced, highlighted, or animated in
- Changes are irreversible — what's there is there because time passed
- The user notices in retrospect, or discovers on a later visit — both are equally valid

### Layer A — Bag Accumulation (existing, one fix needed)

The existing `minDays` threshold system is emotionally coherent. No structural changes.

**One gap to fix:** The amber dot on 🎒 should activate when a new bag item has become available since last bag open — not continuously, just as a soft "something may have changed" signal. This closes the loop between the accumulation happening and the user noticing it.

### Layer B — Found Item System (trigger needed)

All storage, display logic, and bag UI are built. Only the trigger is missing.

**Proposed trigger:** Every 7 `recordedDaysCount`, Sobagi leaves a new found item.

- Day 7 → item #1
- Day 14 → item #2
- Day 56 → item #8 (final)
- After all 8: system goes quiet permanently

Delivery: amber dot appears on 🎒 on next app open after the threshold crossing. User opens bag, finds it in "소박이가 두고 간 것" section. No other signal.

This system is the most emotionally effective immediately-implementable change: no new assets, already built, and the feeling of finding something left behind is uniquely aligned with Sobagi's identity.

### Layer C — Room Object Accumulation (future, asset-dependent)

Small sprite overlays on the room background. None are announced. Each belongs to the room's life — not to the user's achievement history.

**Approved object directions:**

| Object | Behavior | Threshold | Constraint |
|--------|----------|-----------|-----------|
| 🌱 Plant on windowsill | Three growth stages | Advances every ~20 days | Sparse — 3 states max |
| 📚 Books on shelf | One book at baseline, adds quietly | +1 every ~15 days, max 5 | No "level 2 bookshelf" energy |
| ☕ Mug | 1 mug appears after sustained café records | ≥ 3 café records in 7 days, persists | Max 2 mugs ever — surfaces are not prop collections |
| 🕯️ Evening candle | Visible only during evening/night zone | After Day 30 | Atmospheric, not collectible — the strongest model |

**The "lived-in, not decorated" rule:**
> The room should feel inhabited after 90 days, not optimized. Negative space is part of the emotional design. A cozy room becomes emotionally stronger when not every corner is filled.

**What to reject:**
- Furniture sets or major room transformations
- Dense object accumulation
- Any object that creates a "completion" feeling
- Objects that feel like they belong to the user's achievement history rather than the room's life

**Asset dependency:** Room object architecture (overlay layer) can be built now. Individual sprite assets can be added incrementally. This mirrors how room stage 2 is handled — architecture ready, waiting on art.

---

## 7. Anti-Patterns

These apply to every future system, not just the ones in this document.

| Anti-pattern | Why it hurts Sobagi |
|-------------|-------------------|
| Announcing changes | Destroys the discovery feeling; turns presence into performance |
| "You unlocked X" framing | Creates achievement psychology in a companion space |
| Objects that feel like rewards | Users start recording to get objects, not to record their day |
| Warmth drift too fast | Makes the system feel like a game progression curve |
| Observations about amounts | Turns Sobagi into analytics with a cute face |
| Letters arriving too frequently | Mailbox becomes a notification feed; scarcity is the emotional value |
| Every corner filled | Room stops breathing; negative space is load-bearing |
| Treating absence as failure | "Sobagi was waiting" language creates guilt; returning must always feel easy |
| Visible threshold numbers | Day 7, Day 30, Day 90 are internal; users experience "first week," "one month," "long while" |

---

## 8. Implementation Priority

Ordered by emotional impact vs. asset dependency:

### Immediately implementable (no new assets)
1. **Found item trigger** — every 7 `recordedDaysCount`, highest emotional payoff, zero new assets
2. **Atmosphere overlay** — time-of-day tint + warmth drift, pure color math, no assets
3. **Dialogue tier expansion** — message pools per tier, soft observation layer
4. **Bag amber dot fix** — signal when new items available since last open
5. **Mailbox personal letters** — letters 2, 3, 4 content + threshold delivery logic
6. **Mailbox seasonal letters** — 4 world letters + calendar trigger system

### Asset-dependent (design ready, waiting on art)
7. **Room stage 2** — architecture ready, one-line change in `assets.ts` when art arrives
8. **Evening candle** — sprite overlay, evening/night zone only
9. **Plant growth stages** — 3 sprite states, advances every ~20 days
10. **Bookshelf fill** — incremental book sprites
11. **Café mug** — 1–2 max, appears after sustained café records

---

*This document reflects design decisions made in the 2026-05-16 brainstorming session. It supersedes no prior spec — it is additive. Cross-reference with `project-state-2026-05-15.md` for system implementation status. Update this doc when design decisions change; do not update for code changes alone.*

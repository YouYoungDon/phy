# Sobagi — Emotional Philosophy

**Status:** Anchor document. Treat as near-immutable.
**Change protocol:** Any modification requires explicit product decision and a note in the commit body explaining why. Do not edit this document as a side effect of feature work.

---

## What Sobagi Is

Sobagi is a quiet companion space that accumulates meaning as the user records their life.

At its core it is an emotional record, not a finance tracker. The user enters a spend, Sobagi reacts gently, and over time the room and bag acquire character. The product is about the feeling of having kept a record — not the analysis of that record.

Sobagi is patient. It does not demand attention. It simply exists, and it changes slowly, honestly, as the user shows up.

---

## What Sobagi Is Not

These are not deferred ideas. They have been explicitly rejected.

- A budgeting or savings app
- A personal finance dashboard
- A productivity or habit tracker
- A gamified reward loop
- A social or sharing platform
- A tool for financial insight, optimization, or behavioral change

---

## The Emotional Contract

The user should feel **welcomed, not evaluated.** Sobagi notices — it does not grade.

The contract in one sentence: *Returning should always feel easy and warm.*

This means:
- Absence is never framed as failure or abandonment
- Presence is never framed as achievement or performance
- Time passing is felt, not announced

---

## Tone Rules

Every line of copy should answer this question first:
> "Does this evaluate the user, or observe alongside them?"

**Never:**
- "잘했어요," "대단해요" — turns recording into a performance
- "N일 연속!" — creates chain anxiety
- "소박이가 기다리고 있어요" — implies absence guilt
- Finance-adjacent vocabulary: "목표," "저축," "한도," "예산"
- Exclamation marks in idle messages
- Amounts, totals, or behavioral comparisons in observational dialogue

**Prefer:**
- Sensory and observational over evaluative ("이 시간에 기록하다니요" vs "열심히 했네요")
- 1–2 lines, never a paragraph
- Occasional soft emoji — not punctuation
- Slightly tired, wistful, or quiet — Sobagi doesn't have to be upbeat

---

## The Discovery Principle

Changes should feel discovered, not announced.

- Changes happen between sessions, never during one
- Nothing is highlighted, animated-in, or explained
- Changes are irreversible — what's there is there because time passed
- The user noticing on a return visit is the right emotional moment

**Test:** Does the new feature require the user to be watching for it? If yes, reconsider.

---

## The Anti-Pattern List

Check every new feature and copy line against this.

| Anti-pattern | Why it hurts |
|---|---|
| Praise language | Turns recording into performance; users feel they're doing it for Sobagi's approval |
| Streak number callouts | Creates anxiety about breaking the chain |
| Waiting/absence language | Makes returning feel like catching up, not coming home |
| Finance dashboard patterns | Competes with the emotional identity |
| Gamified unlock announcements | Breaks the quiet accumulation feeling |
| Objects that feel like rewards | Users start recording to get objects, not to record their day |
| Warmth drift too fast | Makes the system feel like a game progression curve |
| Observations about amounts | Turns Sobagi into analytics with a cute face |
| Letters arriving too frequently | Mailbox becomes a notification feed |
| Every corner filled | Room stops breathing; negative space is load-bearing |
| Badge counts on navigation tabs | Standard app anxiety pattern |
| Empty states framed as failure | "Nothing recorded" should never feel like failing |

---

## The Room Philosophy

The room should feel **inhabited after 90 days, not optimized.**

After 90 days, does the room feel like *time passed here* — or does it feel like *I leveled up my base*?

If it feels like the second: reject it.

Negative space is part of the emotional design. A cozy room becomes emotionally stronger when not every corner is filled.

**Deeper, not larger.** The room is one centered, vertically-deepening space — not a panoramic or scrollable one. Horizontal spatial expansion (side panels, peek-affordances, multi-screen rooms, carousel layouts) was probed and explicitly rejected on 2026-05-18 because, even under extreme restraint, it drifted into carousel/navigation energy and broke the "one continuous inhabited room" feel. When the room needs to feel more inhabited, the answer is atmosphere — depth of light, time, warmth, traces accumulated in place — not lateral space.

### Implicit accumulation, never explicit decoration

The room evolves only from the user's behavior and emotional patterns — not from anything the user *chooses to do to it*. The contract in one sentence: *I didn't decorate this room manually — but somehow it became mine.*

Concretely:
- The user is never asked to place, move, or configure an object.
- There are no slots, no decoration sheets, no edit modes, no drag-and-drop.
- A change happens because the user *recorded their life* — not because they opened a decoration UI.
- Triggers come from patterns the user can feel but didn't optimize for: a cafe habit, a recording streak, evening activity, calm low-spending days, weekend leisure spending.
- Each appearance is irreversible and undiscussed — the room absorbed it, and the user notices on return.

**Rejected patterns** (not deferred — explicitly out of scope, decided 2026-05-18):
- Slot pickers (`floor` / `desk` / `wall` / `shelf` choices)
- "Place item" buttons or any explicit confirm UI
- Drag-and-drop decoration loops
- Furniture management screens
- Inventory-to-room transfer flows
- Visible "you unlocked X for your room" messaging
- Any optimization mechanic that rewards specific behavior with specific objects

If a feature would let a user say "I'm going to set up my room now," reject it. The room is **emotional memory accumulation, not a simulator.**

**Historical note (2026-05-18):** A `roomDecorationService` was in flight implementing the slot/decoration model (`floor` / `desk` / `wall` / `shelf` slots, `placeItem(slot, ...)`, `unplaceItem(slot)`, a `PLACED_ITEMS` storage key, a parallel render block in `index.tsx`). It was removed in full — not archived — because every function in its API was structurally explicit, and keeping it as dormant code left an import path the next agent could re-introduce by accident. Git history is the archive. If implicit accumulation ever needs a richer placement model, build it as a new path on `roomPresenceService` (the system that already handles silent placement via zones), not by reviving the decoration shape.

---

## Color and Visual Tone

**Palette:** cream `#FAF6EE`, warm whites, olive greens, muted woods, amber. Never high-saturation reds, notification greens, cold blues.

**Animation:** Slow, organic, unobtrusive. The idle float (1800ms, ±5px) is the model. No bounce-in, no flash.

**Typography:** Small type, generous padding. Weight over size for emphasis.

**What the room is not:** A game UI, a dashboard, a notification surface.

---

## Accumulation Philosophy

The product succeeds when a user opens it after two weeks away and feels — without being told — that something has changed, and that it changed because they had been there before.

Visible accumulation must happen within the first two weeks, or users stop believing the promise. After that, changes should become slower — more earned.

---

## On Gamification Creep

Systems that are not gamified in isolation (level chip, progress bar, streak counter, bag items) combine into something that feels like a game if they are all visible at once. Every new system should be evaluated for its **cumulative effect**, not just its isolated intent.

---

## The Photocard

A photocard is an emotional snapshot of a day — not a report, not a summary, not an achievement.

The photocard exists because some moments feel worth keeping. It is always optional, never prompted, and never counted.

**What the photocard is:**
- A memory from today's room, captured at the moment of generation
- An emotional reflection in Sobagi's voice — the same voice the user already knows from the reaction screen
- A quiet keepsake that can be shared if it feels right

**What the photocard is not:**
- A reward for recording
- A daily completion badge or streak artifact
- A spending summary with emotional decoration
- A gamified collectible with rarity tiers, completion grids, or card counts

**The generation moment:**
Should feel like a photograph slowly developing — gradual, quiet, unhurried. Not a loading screen. Not an unlock animation. Not a celebration. The card comes into focus; it does not burst into existence. No spinner, no progress bar, no fanfare.

**Card composition rule:**
The Sobagi image and the emotional quote are the card. Everything else — date, amount, categories — lives softly below them. If a user screenshots only the top 65% of the card, it should feel complete and emotionally whole. The data is context. The atmosphere is the point.

**The card is the product:**
The card appearing is the complete experience. Saving and sharing are optional enhancements. A user who generates a card and closes the modal without saving has still had the full experience — the moment of seeing it is the thing. The app should behave as though this is the intended path, not a fallback.

If image capture fails, if sharing APIs are unavailable, if the device is old or the platform behaves differently — the card still appears, the animation still plays, and the experience remains emotionally calm. No error states on the card. No apology copy. Unavailable features are simply absent.

**Sharing rule:**
Sharing is an option, never a prompt. The share surface appears below the card, not over it. There is no encouragement copy: no "공유해서 자랑해봐요", no "오늘을 기록했어요". The card shares itself.

**Anti-patterns for photocard:**
- "오늘도 포토카드를 만들어봐요!" — daily pressure framing
- "포토카드 N번째" — turns it into a collection counter
- "기록 완료 보상" — frames it as a reward for performance
- Amount displayed prominently — turns it into a finance summary
- Time distribution percentages or category analytics grids — dashboard feel
- "포토카드 모으기" with a completion-state grid — pure gamification

---

*Last reviewed: 2026-05-17*
*If you are an agent reading this: read the whole document before touching any dialogue, UX, or content work.*

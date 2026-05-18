# Sobagi — Multi-Agent Collaboration Workflow

**Date:** 2026-05-16
**Purpose:** Lightweight coordination protocol for parallel and sequential agent work on Sobagi.

The goal is a small, emotionally-focused creative team — not enterprise project management. Every rule in this document exists because something went wrong without it, or because Sobagi's identity is fragile enough to need explicit protection.

---

## 1. The Living Documents

Every agent reads and (when relevant) updates these three files before touching code. Full update rules are in `SOBAGI_CURRENT_STATE.md §Update Rules`.

| Document | Role | Update frequency |
|---|---|---|
| `docs/SOBAGI_PHILOSOPHY.md` | Emotional anchor — tone rules, anti-patterns, what the product is | Rare; only on explicit product decisions |
| `docs/SOBAGI_CURRENT_STATE.md` | Single operational source of truth — system status, storage keys, known issues, latest handoff | When a system changes status or a handoff is written |
| `docs/SOBAGI_NEXT_PRIORITIES.md` | Current work queue — ordered list of what to do next | Before starting work; after finishing |

### Update rules

**SOBAGI_PHILOSOPHY.md**
- Do not edit as a side effect of feature work
- If a feature decision contradicts something in this document, stop and surface it to the product owner
- If a new anti-pattern is discovered, add it — this is the correct update

**SOBAGI_CURRENT_STATE.md**
- Update when a system moves from one status category to another (partial → complete, planned → partial)
- Update when new known issues are discovered or resolved
- Update when storage keys change
- Do NOT update just because code changed internally — only when the system's role or status changes
- Do NOT accumulate historical notes, "as of date X" summaries, or narrative logs — the document represents now, not then
- Completed work: one row in the System Status table. Detail stays in the spec/plan file and commit history

**SOBAGI_NEXT_PRIORITIES.md**
- Update at the start of work (claim the item you're taking)
- Update at the end of work (mark done, surface what's next)
- Keep it short — 15 items max, strictly ordered

**docs/archive/** (read-only for agents)
- Contains dated project-state snapshots (`project-state-YYYY-MM-DD.md`) and superseded planning documents
- Never authoritative — if archive contradicts CURRENT_STATE, CURRENT_STATE wins
- Do not move spec or plan files here until the feature is shipped and the file will never be referenced again

---

## 2. Agent Startup Protocol

**Every agent must do this before writing a single line of code or copy.**

### Mandatory reads

1. `docs/SOBAGI_PHILOSOPHY.md` — full read, no skimming. Pay particular attention to the anti-pattern list.
2. `docs/SOBAGI_CURRENT_STATE.md` — scan the system status tables and known issues
3. `docs/SOBAGI_NEXT_PRIORITIES.md` — understand what's already claimed and what's blocked
4. The relevant spec file for your task (in `docs/superpowers/specs/`)
5. The relevant plan file for your task (in `docs/superpowers/plans/`)

### Before touching any existing file

Read it. Don't rely on what you think it contains. The file has likely been modified since the plan was written.

### Startup questions to answer before starting

- What philosophy rule is most at risk in this task? Name it.
- What existing file am I most likely to break? Read it first.
- Is there any part of this task that could introduce reward framing, achievement language, or announcement behavior?

If you cannot answer the third question with "no," surface it before proceeding.

---

## 3. Agent Completion Protocol

**Every agent must do this before considering work done.**

### Required steps

1. Run `npm run typecheck` — no new errors
2. Run `npm test` — all tests pass
3. Write a **Handoff Note** (format below)
4. Update `docs/SOBAGI_CURRENT_STATE.md` if any system changed status
5. Update `docs/SOBAGI_NEXT_PRIORITIES.md` to reflect what was done and what's next

### What "done" means

A task is done when:
- Code is committed
- Tests pass
- SOBAGI_CURRENT_STATE.md reflects the new status
- A handoff note exists for the next agent

A task is NOT done if:
- The typecheck has new errors (pre-existing errors are acceptable; new ones are not)
- Any test that was previously passing now fails
- The handoff note is missing

---

## 4. Handoff Note Format

Leave a handoff note as a section in `docs/SOBAGI_CURRENT_STATE.md` under `## Latest Handoff`. Replace the previous note — only one active handoff note exists at a time.

```markdown
## Latest Handoff

**Agent:** [Engineering / Design / Product / QA]
**Date:** YYYY-MM-DD
**Group completed:** [A / B / C / D / ...]

### What changed
[List files modified and a one-line description of each change]

### What's now working
[Describe behavior that wasn't working before]

### What's fragile or surprising
[Anything the next agent must know — edge cases, off-spec behavior, pre-existing issues touched]

### What the next agent should NOT do
[Specific actions that would break the current state]

### Next group
[Group name and one-sentence description]
```

---

## 5. Philosophy Protection Rules

These are specific checks — not general guidelines. Run each one before committing.

### The Announcement Test
> Does this change tell the user something changed?

Toast, badge count increase, unlock animation, push notification, "새 아이템 추가됨" — any of these fails. The only acceptable signals are the soft amber dot on the bag and the soft `!` on the mailbox.

### The Evaluation Test
> Does any new copy evaluate the user's behavior?

Praise ("잘했어요"), judgment ("많이 썼네요"), or streak anxiety ("N일 연속") fails. Observational and sensory language passes.

### The Finance Test
> Does any new element make Sobagi feel like a budgeting app?

Large bold monetary totals, category percentage breakdowns, comparison language, savings targets — any of these fails. The existing settlement section is already a known tension; do not add to it.

### The Reward Test
> Could a user interpret this new element as something they "earned"?

If yes — is the earning invisible? If the user cannot identify what they did to cause the change, it passes. If they can connect it directly to a specific action and feel rewarded for it, reconsider.

### The Cumulative Effect Test
> Does this new element, combined with everything already on screen, feel like a game?

Evaluate the whole screen, not just the new addition. If adding this brings the screen over the line from "quiet companion" to "game," reconsider.

---

## 6. Parallel-Work Safety

### What can safely happen in parallel

| Work | Safe to parallelize |
|---|---|
| New service file (atmosphereService, dialogueService) | Yes — new file, no overlap |
| New test file in `__tests__/` | Yes — isolated |
| New constants file (dialogue.ts, letters.ts) | Yes — new file |
| Spec/design document work | Yes — different file |
| `docs/SOBAGI_PHILOSOPHY.md` | No — one editor at a time |

### What requires sequential review

| Work | Why sequential |
|---|---|
| `src/pages/index.tsx` | Multiple groups modify this file; parallel edits will conflict |
| `src/hooks/useAppInit.ts` | Multiple groups add to this file; merges are tricky |
| `src/constants/storage.ts` | Shared keys; parallel additions risk key collision |
| `docs/SOBAGI_CURRENT_STATE.md` | Content changes, not code; conflicts are non-obvious |
| Any change to emotion messages or Sobagi dialogue | Must be reviewed against SOBAGI_PHILOSOPHY.md in full context |

### The sequential rule for index.tsx and useAppInit.ts

Groups B, C, D, and E all touch `src/pages/index.tsx`. Execute them in order. Before starting any group that modifies this file:

1. Read the current file
2. Check `git log --oneline -5` to confirm no pending work is uncommitted
3. Do not start until the previous group's commit is in HEAD

### Assumption collision prevention

Before starting a task, check whether your task makes any of these assumptions:
- A specific storage key has a specific value type
- A specific component renders in a specific order
- A specific state variable exists with a specific shape

If yes — verify by reading the current file, not the plan. Plans can be outdated.

---

## 7. Emotional Consistency by Role

Each agent role has a specific lens for protecting Sobagi's identity.

### Product / UX

Owns: the emotional contract, feature acceptance, dialogue copy

Before approving any feature:
- Does this create pressure on the user?
- Does this add a visible system that competes for attention?
- Does the cumulative density of the screen feel right?

Copy veto: any dialogue line that evaluates rather than observes is a product veto, not an engineering note.

### Design

Owns: visual tone, color, animation, spatial hierarchy

Before approving any visual change:
- Does this introduce a notification pattern (badge, counter, animation-on-change)?
- Does this compete with the room's ambient quality?
- Is the negative space still intact?

The room is the hero. No element should draw more attention than Sobagi herself.

### Engineering

Owns: code quality, performance, philosophy compliance at implementation level

Before committing any change:
- Does the implementation hide the mechanism from the user? (Discovery Principle)
- Are all overlay/decoration Views `pointerEvents="none"`?
- Could this fire a storage write that creates an observable event visible as an "unlock"?

Specific responsibility: if the spec says "quiet," the implementation must be quiet. Don't add logs, console output, or state that bleeds into UI.

### QA

Owns: regression, edge cases, long-term tone consistency

Test cases that QA should always run for any new dialogue or UX:
- Does this behave correctly on Day 0 (new user)?
- Does this behave correctly on Day 1 (one record, then returning)?
- Does this behave correctly after a 10-day gap?
- Does anything look like a reward announcement when it shouldn't?
- Does this behave correctly when `recordedDaysCount` is 90 (all caps and maxes reached)?

---

## 8. Document Hierarchy

When documents conflict, this is the resolution order:

```
SOBAGI_PHILOSOPHY.md          highest authority — if a plan contradicts it, stop
        ↓
SOBAGI_CURRENT_STATE.md       authoritative on current state — if a plan is out of date, state wins
        ↓
SOBAGI_NEXT_PRIORITIES.md     authoritative on what to do next
        ↓
docs/superpowers/specs/       approved designs — if implementation deviates, document why
docs/superpowers/plans/       implementation guidance — plans may be stale; read carefully
        ↓
docs/archive/                 historical only — never authoritative on current state
        ↓
code                          final truth of what runs; docs should reflect code, not vice versa
```

**Practical resolution:**
- If a spec calls for something PHILOSOPHY forbids → stop, surface to product owner
- If a plan is out of date → follow current state doc + code, not the plan
- If an archived snapshot contradicts current state → archived snapshot is wrong, ignore it
- If code and CURRENT_STATE disagree → update CURRENT_STATE to match code

---

*This document should feel like a lightweight working agreement, not a compliance checklist. If following it feels like overhead, the protocol has become too heavy — trim it.*

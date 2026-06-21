# Money/Tone Identity — Design Decision

**Date:** 2026-06-21
**Status:** Decided (live app, post-release alignment)
**Context:** Over the June dev cycle Sobagi drifted money-forward (net ledger on
home, signed/colored calendar amounts, right-aligned amount input, a
"부자되세요" greeting). A `fix(sobagi): soften money surfaces` commit tried to
tone these down and was then reverted. The oscillation signaled an unresolved
product-identity question. This doc settles it so future work stops re-litigating
it.

## The decision

**"Money DATA is clear and money-forward; Sobagi's VOICE stays cozy."**

Sobagi is a money tracker wearing a warm companion skin. The numbers are shown
plainly — no euphemism, clear signs/colors/totals — but the character's voice,
the room, and the photocard never use finance-cheerleader language.

This means the two channels are governed by different rules:

- **Data channel = clear, money-forward. KEEP as-is. Do NOT re-soften.**
- **Voice/atmosphere channel = cozy, non-finance. Warm, never "get rich" energy.**

## Surface map

### Data channel — keep money-forward (the "soften" revert was correct)
- **Record amount input** — fixed 30pt, right-aligned, persistent `원`, default `0원`.
- **Record in-card recap** — spending `−`, income `+`.
- **Stats calendar cells** — income `+` (red), spending `−` (blue); 함께 보기 shows the two separately; compact 만-notation in cells only.
- **Stats monthly totals row** — `쓴 돈` / `들어온 돈` (two totals, no net).
- **Home `TodaySurface`** — the daily net ledger (들어온 + / 쓴 − / 합계). **Stays on home.** Home being a quick money glance is intentional.
- **Home `DailySummary`** — keeps its amount.

None of these are softened. The reverted `soften money surfaces` change is **not**
reapplied.

### Voice / atmosphere channel — cozy, non-finance
- **First-launch greeting** (`FIRST_GREETING` in `index.tsx`) — the one finance-cheerleader line in the voice channel. **Changed** from `소박이와 가계부 쓰고 부자되세요` to `오늘부터 소박이와 천천히 기록해봐요 🌿`.
- **Ambient dialogue, reaction copy** — already governed by the `dialogue.ts` banned-vocab guard (부자/수익/보상/벌었/입금/잔액/통장/저축 …). No finance-cheerleader tone.
- **Room, character, photocard** — no money framing (unchanged).

## The only code change

`src/pages/index.tsx`: replace the `FIRST_GREETING` constant string.

```
- const FIRST_GREETING = '소박이와 가계부 쓰고 부자되세요';
+ const FIRST_GREETING = '오늘부터 소박이와 천천히 기록해봐요 🌿';
```

The one-time first-launch display mechanism (`FIRST_GREETING_SHOWN` flag) is
unchanged.

## Guardrail for future work

- Do **not** reintroduce a "soften money surfaces" pass against the data channel
  (TodaySurface net, calendar colors/signs, amount formatting). Those are
  deliberate.
- Do **not** add finance-cheerleader language to the voice channel (greetings,
  ambient lines, reaction copy). Keep Sobagi's voice warm and observational.
- New surfaces inherit the rule by channel: is it a *number readout* (→ clear,
  money-forward) or *Sobagi talking / atmosphere* (→ cozy, non-finance)?

See memory: `feedback_sobagi_allowance_giving_scene` (money-forward data pivot
note) and `project_sobagi_vision`.
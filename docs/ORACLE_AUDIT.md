# Oracle entropy audit

_Run it yourself: `deno task audit` (add `--days=365`, `--live`, `--speak`,
`--json`). Source: `scripts/oracle-audit.ts`._

The question: the readings feel samey — how much real entropy, and how much
actual sky, reaches the prose?

Short answer: **the astronomy is real and correctly computed, but the ranking
function that picks what the model writes about selects for the slowest-moving
features in the sky.** The daily signal exists; the prompt mostly throws it
away. On top of that, 76% of the prompt is byte-identical boilerplate that
prescribes a fixed three-act shape.

All numbers below come from `scripts/oracle-audit.ts` over a 365-day sweep of
the real ephemeris (astronomy-engine), sampled at the rite moment (15:33 UTC,
per `main.ts`).

---

## 0. Check this first

`STARGRAM_GEMINI_KEY` is not mentioned in `.env.example`, `README.md`,
`DEPLOYMENT_READY.md` or `CLAUDE.md`. If it is unset — or Gemini 4xx's —
`speakReading()` returns `null`, `composeFallback()` runs, and the API returns
`200 OK` with `source: "oracle-fallback"`. Nothing logs loudly, nothing breaks,
and the reading still types out on screen.

The fallback's entire output space, measured over 4,380 generated readings:

- **48 distinct opening sentences**
- **64 distinct sentence skeletons** (4 openers x 4 tails x 4 closers, exactly
  as designed)

If production is serving the fallback, that alone explains "samey" and nothing
else in this document matters yet. Check `source` on a live response:

```
curl -s 'https://stargram.app/api/horoscope?sign=leo' | grep -o '"source":"[^"]*"'
```

---

## 1. The sign barely exists as an astrological input

`buildPacket()` calls `skyForSign(sky, sign.rulingPlanet)`. That is the whole
per-sign astrology. The sign's own 30 degrees of the zodiac is never consulted —
there is no "Mars is entering your sign", no houses, no transit-to-sign
relationship at all. The reading is about the sign's ruling planet, not about
the sign.

Consequences, measured:

|                          |                                |
| ------------------------ | ------------------------------ |
| 12 signs resolve to      | **10 distinct ruling planets** |
| taurus + libra (Venus)   | astro block **byte-identical** |
| gemini + virgo (Mercury) | astro block **byte-identical** |

Those two pairs receive the same aspects, the same ruler placement, the same
retrograde line — forever. The only things separating a Taurus reading from a
Libra reading are the sign name, the image domain, the private draw, and
sampling noise.

Also never reaching the prompt: `element`, `modality`, `keywords`, `bio`,
`signatureMove`, `motto`. Every trait in `utils/zodiac.ts` that makes a sign a
character is dropped before the model sees anything. (The fallback composer at
least uses `motto`.)

## 2. The theme-anchor is the slowest thing in the sky

The prompt says: _"Build it around ONE theme from the strongest of these actual
computed aspects."_ So `rulerAspects[0]` **is** the reading's subject. Power is
`aspectWeight x tightness x bodyWeightA x bodyWeightB` — with no term for how
fast the pair is moving.

Generational aspects therefore win, and hold for months. Most-repeated theme
anchors across a year:

| Sign (ruler)          | Anchor                 | Days per year |
| --------------------- | ---------------------- | ------------- |
| scorpio (Pluto)       | Uranus trine Pluto     | **109**       |
| aquarius (Uranus)     | Uranus trine Pluto     | **91**        |
| capricorn (Saturn)    | Jupiter trine Saturn   | **83**        |
| sagittarius (Jupiter) | Jupiter trine Saturn   | 69            |
| pisces (Neptune)      | Uranus sextile Neptune | 62            |
| pisces (Neptune)      | Neptune sextile Pluto  | 57            |

Pisces spends **119 days a year** on two anchors. Scorpio spends 30% of the year
on one. And Uranus trine Pluto is the _same aspect_ anchoring both Scorpio and
Aquarius, on 200 sign-days a year.

Distinct theme-anchors a sign can ever be given, over a full year:

```
aries        24/365      libra        30/365
taurus       30/365      scorpio      25/365
gemini       31/365      sagittarius  24/365
cancer       43/365      capricorn    24/365
leo          30/365      aquarius     26/365
virgo        31/365      pisces       24/365
```

Mean churn: **7.8% of days bring a new anchor**. Longest unchanged run: 43 days
(taurus/libra, Venus sextile Pluto — power decaying from 3.96 to 1.01 while
still ranked first).

There is no minimum power floor and no applying/separating distinction, so a
dying aspect stays "the strongest" for weeks purely because nothing else is in
orb. **48.6% of the aspect lines shown to the model have power below 2** — near
dead, still listed as evidence.

The Moon is the only genuinely daily body in the system, and it is the theme
anchor only **22% of the time** (801 of 3,650 sign-days). The rest of the time
the fastest signal in the packet loses to two outer planets that will still be
trine each other next year.

On the other side: some days there is nothing at all. Days per year where the
ruler has **zero** aspects and the prompt asks for a theme from an empty list:

```
Sun 24 · Mercury 19 · Moon 19 · Venus 18 · Jupiter 15 · Saturn 11 · Mars 5
Pluto 0 · Uranus 0 · Neptune 0
```

Mean aspect lines shown per prompt: **2.88** (min 0, max 5).

## 3. Most of the prompt is the same prompt

| Measure (365 days x 12 signs, daily)  | Value        |
| ------------------------------------- | ------------ |
| prompt size                           | ~3,795 chars |
| byte-identical across every prompt    | **76.1%**    |
| same-day, cross-sign token similarity | **80.0%**    |
| same-sign, next-day token similarity  | **80.1%**    |

Those last two matter most: **a Leo reading and a Pisces reading on the same
night are built from prompts that are 80% the same words** — and so are today's
and tomorrow's. The model is being asked to produce variety from inputs that are
four-fifths identical.

And the fixed 76% is not neutral. `IDENTITY` prescribes a structure: open with a
small true observation from ordinary life, carry ONE theme, anchor to the sky
once lightly, end with a fridge line. Every reading has the same three-act shape
by construction, before entropy is even considered. That is probably the largest
single contributor to the felt sameness — it is a stylistic mould, not a
shortage of dice.

## 4. The dials are shared, so they cannot separate signs

- **Voice register** (`HOUR_REGISTER`, planetary hour): all 7 registers do
  appear across a month — good. But the hour is computed once per rite, so **all
  12 signs on a given night get the same register.** It varies across time,
  never across signs.
- **Temperature** (moon illumination, 0.75–1.20): same story. Real daily
  variation, zero cross-sign variation.
- **Measured sky** (`live-sky.ts`, NOAA + JPL): cached 20 minutes, so one rite
  reads one value. Identical for all 12 signs, and the Kp label collapses to
  four buckets that sit on "quiet" most of the time. The "analog entropy" is
  real but it is one shared knob, moved rarely.

So of the four mood dials, **none of them differentiate one sign from another on
a given night.** They only make tonight differ from last night.

## 5. What actually does vary per sign

Credit where due — two channels carry real per-sign entropy:

- **Image domain** (`IMAGE_DOMAINS`, hashed on date+sign): 12 territories, mean
  **8.0/12 distinct** across the 12 signs on a given day. Close to the ~7.6 a
  uniform random draw predicts, so the hash is healthy. About 4 signs a day
  share a domain with another sign.
- **Daily draw** (tarot 78x2 x hexagram 64 x runes): a genuinely large space,
  unique per (sign, date).

But the draw is handed over marked `PRIVATE`, with instructions that **exactly
one** of the three may "quietly agree" with the aspect, and none may be named.
That is a deliberately weak channel — the largest entropy source in the packet
is throttled to a whisper by design.

## 6. Weekly and monthly are instantaneous snapshots

`buildPacket()` uses `moonState(now)` and `computeSky(now)` regardless of
period. A monthly reading is therefore written from **one instant's** aspects
and **one instant's** moon phase, then labelled as an arc across a month. The
prompt tells the model "Moon right now: Waxing Gibbous, 78% lit" and asks for
250–320 words about the coming month.

Measured: consecutive monthly prompts are **97.8% similar** — they differ only
in orb decimals and the moon line.

The period also does nothing to the aspect selection: a monthly reading can be
anchored to a Moon aspect that will be over in nine hours.

## 7. The anti-repetition journal is thin and conditional

`nightlyRite()` writes one journal line per rite, built from **`firstReading`
only** — always aries — capped at 10 words of prose, `JOURNAL_DEPTH = 6`. So the
model's memory of what it has already said is six aries fragments.

Two gaps:

- `readJournal()` returns `[]` when KV is unavailable. Per the warning in
  `ritual.ts`, a Deploy app with no database attached gets a silent per-instance
  in-memory KV — in which case the journal is **always empty and the
  anti-repetition instruction never fires at all.**
- `riteOpeners` (the within-rite dedupe that stops twelve signs reaching for the
  same kitchen drawer) exists **only in `nightlyRite()`**. The self-heal path,
  `getReading()` → `divineSign()`, passes the journal but no rite openers. After
  a fresh deploy or a KV miss, the 12 signs are generated with no cross-sign
  dedupe whatsoever.

## 8. `/api/cosmic-context` does not touch the reading

`ZodiacPicker.tsx` calls `/api/cosmic-context` and `/api/horoscope` in parallel
(and says so in a comment at line 406). The Signal Room packet — discordian
date, charms, live sky readout — is display only. Nothing on that panel
influences a single word of the prose. Worth knowing when the terminal shows a
storming geomagnetic field next to a placid reading.

---

## Results of the entropy pass

Everything above is the BEFORE. The fixes landed in the same branch; these are
the same metrics re-measured over the same 365-day sweep.

| Metric                               | Before              | After               |
| ------------------------------------ | ------------------- | ------------------- |
| taurus vs libra astro block          | byte-identical      | **different**       |
| gemini vs virgo astro block          | byte-identical      | **different**       |
| distinct theme-anchors/yr (mean)     | 26                  | **49**              |
| mean anchor churn                    | 7.8% of days        | **13.4%**           |
| worst single anchor                  | 109 days/yr         | **~9 days max run** |
| readings led by a fast (news) aspect | n/a (single anchor) | **93.9%**           |
| anchor involves the Moon             | 22%                 | **41.6%**           |
| distinct anchors across 12 signs/day | 7.3/12              | **8.4/12**          |
| prompt byte-identical share          | 76.1%               | **68.3%**           |
| same-day cross-sign similarity       | 80.0%               | **72.7%**           |
| same-sign next-day similarity        | 80.1%               | **78.0%**           |
| monthly next-period similarity       | 97.8%               | **see note**        |
| fallback sentence skeletons          | 64                  | **201**             |
| fallback opening sentences           | 48                  | **96**              |

What changed, by file:

- **`sky.ts`** — `Placement` carries signed `speed`; `Aspect` carries
  `relSpeed`, `applying` and `daysLeft`. Power gains a `liveliness()` term
  (sqrt-compressed relative speed), so a pair that will still be exact next
  season loses to one that resolves this week. `POWER_FLOOR = 2` exported. New:
  `aspectsToPoint()` and a `skyForSign(sky, ruler, signName)` that also reads
  the sign's **own 30-degree sector** — bodies transiting it, aspects to its
  cusp — and picks a `fastAnchor` (news) and `slowAnchor` (weather) from both
  channels combined. The sector is what un-twins taurus/libra and gemini/virgo,
  and it is what gives the outer-planet signs any fast news at all: Pluto only
  ever aspects other outer planets, so scorpio previously had none.
- **`voice.ts`** — `transitLines()` now emits a labelled TODAY / UNDERNEATH pair
  with tightening-or-loosening and a days-left window, plus the sector line and
  live supporting aspects only. Four `SHAPES` structural templates rotate on a
  date+sign hash. `ELEMENT_LEAN` and `MODALITY_LEAN` give each sign its own
  register on top of the shared planetary hour, and `keywords` reach the prompt.
  Sampling temperature gains a per-sign jitter. **`IDENTITY`'s taste rules are
  untouched** — the voice is the same, the structure it pours into rotates.
- **`compose.ts`** — `periodMidpoint()` and `moonArcFor()`: weekly and monthly
  packets are now cut at the middle of their span and carry the moon's arc
  across it instead of one frozen instant. The fallback composer leads on the
  fast anchor, speaks the sector line, and widens to 8 openers / 6 tails / 8
  closers.
- **`ritual.ts`** — the journal records **all twelve signs** per rite, not just
  aries, at depth 24. A module-level `recentOpeners` ring carries cross-sign
  dedupe into the `getReading` self-heal path, which is the path that actually
  runs after a deploy. A fallback now logs at `error` level and says whether the
  key is set.
- **`.env.example`** — `STARGRAM_GEMINI_KEY` documented, with the symptom of
  omitting it.

Note on monthly: the 97.8% figure measured consecutive _sweep days_ landing in
the same period key, which is no longer the right probe now that the packet is
cut at the period midpoint — a month's prompt is stable within the month by
design. The real test is month-over-month, which needs a multi-month sweep.

**Still input-side.** No prose was measured; `--speak` needs the key. Until that
runs, the claim is "the model is being told something much more varied", not
"the readings read more varied".

## Ranked recommendations

Items 1-9 below were the plan. Items 1-8 are **now implemented** (see "Results
of the entropy pass" above); item 9 is partly done. What remains open is listed
after the list.

1. **Confirm production isn't on the fallback.** Check `source` on a live
   response and document `STARGRAM_GEMINI_KEY` in `.env.example`. Consider
   making a fallback reading log at `error` level, or expose `source` in the
   terminal chrome so it is visible when the Oracle is not speaking.
2. **Add a speed term to aspect power.** Weight by combined mean daily motion,
   or simply exclude outer-to-outer pairs (Jupiter and beyond aspecting each
   other) from `rulerAspects[0]`. Uranus trine Pluto is not news 109 days a
   year. A power floor (drop anything below ~2) would also clear the 48.6% of
   near-dead lines.
3. **Give the Moon a guaranteed lane.** The Moon changes sign every 2.5 days and
   is the only true daily signal. Either anchor on the fastest in-orb aspect
   rather than the most powerful, or feed the model two anchors — one slow
   "season" theme, one fast "today" theme — and let the fast one lead.
4. **Make the sign an astrological object.** Use the sign's own 30-degree
   sector: which bodies are currently transiting it, what is aspecting it. That
   alone un-twins taurus/libra and gemini/virgo, and gives all 12 signs a
   genuinely different sky rather than a shared one seen through a different
   planet.
5. **Feed the sign's character into the prompt.** `element`, `modality` and
   `keywords` are already written and sitting unused in `utils/zodiac.ts`.
6. **Vary the mould, not just the filling.** The fixed 76% is doing more damage
   than the missing entropy. Rotate 3–4 structural templates (observation-first,
   question-first, second-person-scene, flat declarative) seeded on date+sign,
   so the _shape_ of the reading changes and not only its subject.
7. **Widen the journal.** Record all 12 signs per rite, not just aries, and
   carry `riteOpeners` into the `getReading()` self-heal path. Cheap, and it
   makes the dedupe work on the path that actually runs after a deploy.
8. **Let the draw speak louder.** It is the biggest entropy source in the packet
   and it is gagged. Loosening it to "let the draw shape the reading's movement,
   still without naming it" costs nothing and buys a lot.
9. **Build period-appropriate packets.** For weekly/monthly, sample the sky
   across the span (aspects that perfect during the period, the moon phases the
   period actually contains) instead of freezing one instant.

## Not yet measured

`--speak` in the audit script generates all 12 signs for one rite and reports
mean pairwise prose similarity and distinct opening shapes. It needs
`STARGRAM_GEMINI_KEY`, which was not available in the environment this audit ran
in, so **every number above is input-side.** Run
`deno task audit --speak
--days=1` locally to close the loop and measure the
prose itself.

### Still open

- **Image domains** stay at 12, so ~4 signs a day still share one. Widening the
  list to ~20 is a one-line change whenever it is worth doing.
- **The draw is still gagged** (recommendation 8). It remains the largest
  unexploited entropy source in the packet; loosening it is a taste call about
  how much the tarot should steer the prose, so it was left alone.
- **No prose measurement yet** — `--speak` needs `STARGRAM_GEMINI_KEY`.
- **Month-over-month variance** needs a multi-month sweep to probe properly.

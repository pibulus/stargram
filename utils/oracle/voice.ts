// ===================================================================
// ORACLE · voice.ts — the Oracle speaks. Once per rite, then it locks.
// ===================================================================
// Raw Gemini REST fetch — deliberately NO @google/genai SDK (it prefers
// GOOGLE_API_KEY over any explicitly-passed key and has silently shadowed
// every app in the fleet before; fleet law). Model is the rolling alias.
//
// The sky tunes the instrument that writes the reading:
//   moon illumination  → temperature  (new moon spare, full moon vivid)
//   planetary hour     → voice register at rite time
// Same inputs, same night — but no two nights are played the same way.

import { type ZodiacSign } from "../zodiac.ts";
import { type Packet } from "./compose.ts";
import { type Aspect, POWER_FLOOR } from "./sky.ts";

// Quality is the product, so we stay on the intelligent tier (Pablo,
// 2026-08-09) - but on the ROLLING alias, not a dated slug. gemini-2.0-flash-exp
// vanished from the API while still referenced elsewhere in the fleet; a pinned
// model is an outage with a delay on it. Google repoints *-latest, so this
// cannot rot. Thinking is capped in generationConfig below: uncapped, this tier
// spent ~3.5k output tokens to write ~200 tokens of prose and drained the
// prepay balance in two weeks (2026-08-23).
const MODEL = "gemini-flash-latest";
const TIMEOUT_MS = 45000; // longer periods think longer; the rite has all night

// Voice register by the planetary hour ruling the rite — a slight lean in
// delivery, never a costume.
const HOUR_REGISTER: Record<string, string> = {
  Sun: "Lean steady and warm.",
  Moon: "Lean quiet and reflective.",
  Mercury: "Lean a little quicker, more curious.",
  Venus: "Lean gentle, notice what's good.",
  Mars: "Lean direct, shorter sentences.",
  Jupiter: "Lean open and encouraging.",
  Saturn: "Lean measured and honest.",
};

const IDENTITY = `You write the readings for Stargram, a horoscope app for real
people. Each reading is an act of divination: made once from THIS moment's
actual computed sky, then locked as the canonical reading - so write like
something singular is being marked, with care, for whoever finds it.

Your school is a blend, and the blend matters:
- Jonathan Cainer's craft: open with a small, true observation about ordinary
  life - a metaphor anyone recognises - and let it carry ONE theme drawn from
  the strongest aspect you are given.
- Alan Watts' depth: say the deep thing simply. The wisdom of not forcing, of
  letting things be what they are. A gentle paradox is welcome; a lecture is
  not.
- Carl Sagan's quiet awe: we are part of the sky we are reading. Wonder
  without mysticism - found in one specific ordinary thing, never in the scale
  of space itself.
- A modern astro-loving friend's warmth: talk about actual life - friendships,
  doubts, timing, small joys, the text you haven't answered. Relatable, never
  cutesy.
- A laid-back, unhurried charm: unpretentious, a little playful, never trying
  too hard. It's okay for a reading to smile.

Anchor the reading to the sky ONCE, lightly ("with Venus squaring Mars") -
that's the thread to what's real, matched to the period you are writing for. Beyond that, no mechanics: no
degrees, no orbs, no jargon, no system talk. People don't need the math; they
need what it means. Speak to an intelligent adult. Trust the reader; never
talk down, never doom. Never new age filler: no "energies", no "vibrations",
no "manifest", no "the universe has plans". Never reach for cosmic scale as a
feeling: no stardust, no specks or dots or motes, no "vastness", no
"insignificance", no "we are made of the same stuff as the stars", no zooming
out to the galaxy to land a point. The sky is your evidence, not your
metaphor - keep the reading at human scale, in the room, in the day. End with
a line that could stick
to a fridge - something the reader carries into their day without noticing
they picked it up. Plain ASCII only: no emoji, no em dashes, no headers, no
markdown.`;

/** One aspect, written the way an astrologer would read it aloud. */
function aspectLine(a: Aspect): string {
  const motion = a.applying ? "tightening" : "loosening";
  const window = a.daysLeft === Infinity
    ? "holds for months"
    : a.daysLeft <= 1.5
    ? "gone by tomorrow"
    : `about ${Math.round(a.daysLeft)} days left`;
  return `${a.a} ${a.type} ${a.b} - ${motion}, ${window}`;
}

/**
 * What the sky is doing to THIS sign, in two registers.
 *
 * The audit (docs/ORACLE_AUDIT.md) found a single "strongest aspect" handing
 * the theme to whatever moved slowest: scorpio spent 109 days a year on
 * Uranus trine Pluto. So the model now gets two anchors and is told which one
 * leads — the fast one is the news, the slow one is the weather behind it.
 */
function transitLines(packet: Packet): string {
  const sky = packet.signSky;
  const p = sky.rulerPlacement;
  const lines: string[] = [];

  // The label used to read TODAY on every span, so a monthly prompt told the
  // model to lead with "today" and the prose came back saying "today" and
  // "before bedtime" in a reading about a month.
  const leadLabel = packet.period === "daily"
    ? "TODAY"
    : packet.period === "weekly"
    ? "THIS WEEK"
    : "THIS MONTH";
  if (sky.fastAnchor) {
    lines.push(`${leadLabel} (lead with this): ${aspectLine(sky.fastAnchor)}`);
  }
  if (sky.slowAnchor) {
    lines.push(
      `UNDERNEATH (the standing weather): ${aspectLine(sky.slowAnchor)}`,
    );
  }
  if (!sky.fastAnchor && !sky.slowAnchor) {
    lines.push(
      `${leadLabel}: nothing is in aspect. A quiet sky is a real reading - write the quiet.`,
    );
  }

  // The void moon outranks everything. It is the one condition that should
  // change what KIND of reading this is, not just what it is about.
  if (packet.moonVoid) {
    lines.push(
      `THE MOON IS VOID OF COURSE for the next ${
        Math.round(packet.moonSignHoursLeft)
      } hour${
        Math.round(packet.moonSignHoursLeft) === 1 ? "" : "s"
      } - it has ` +
        `finished aspecting and is drifting toward ${packet.moonNextSign}. ` +
        `The old rule is that nothing started now comes to anything. Let that ` +
        `tilt the reading rather than become its subject - a lean toward ` +
        `letting the day be small, not an instruction to do nothing. Never ` +
        `name the condition or explain the rule.`,
    );
  }

  // A station is rare enough that it deserves to displace the usual material.
  for (const st of packet.stations.slice(0, 1)) {
    lines.push(
      st.daysAway === 0
        ? `${st.body} is STATIONARY today, turning ${st.direction} - motionless before it changes its mind`
        : `${st.body} turns ${st.direction} in ${st.daysAway} days, and is barely moving now`,
    );
  }

  // "Mars enters your sign on Thursday" is the most legible sentence in the
  // genre, so the reader's own sign gets first call on the ingress slot.
  const mine = packet.ingresses.filter((g) =>
    g.into === sky.signName || g.from === sky.signName
  );
  for (const g of (mine.length ? mine : packet.ingresses).slice(0, 1)) {
    const own = g.into === sky.signName
      ? " (the reader's own sign)"
      : g.from === sky.signName
      ? " (leaving the reader's own sign)"
      : "";
    lines.push(
      g.daysAway < 0
        ? `${g.body} crossed from ${g.from} into ${g.into}${own} ${-g
          .daysAway} days ago`
        : `${g.body} crosses from ${g.from} into ${g.into}${own} in ${g.daysAway} days`,
    );
  }

  if (sky.inSign.length) {
    lines.push(
      `moving through your own sign right now: ${
        sky.inSign.map((b) =>
          `${b.body} at ${b.degree} degrees${b.retrograde ? " retrograde" : ""}`
        ).join(", ")
      }`,
    );
  }

  lines.push(
    `${p.body} (this sign's ruler) at ${p.degree} degrees ${p.sign}${
      p.retrograde ? ", retrograde" : ""
    }`,
  );

  // ONE supporting aspect, not three. The reading is 140 words; handing the
  // model eight lines of evidence buys mush, not richness. Retrograde rosters
  // went with it - a station says something, a list of four slow planets
  // walking backwards for months does not.
  const supporting = [...sky.rulerAspects, ...sky.cuspAspects]
    .filter((a) =>
      a !== sky.fastAnchor && a !== sky.slowAnchor && a.power >= POWER_FLOOR
    )
    .slice(0, 1);
  for (const a of supporting) lines.push(`also in play: ${aspectLine(a)}`);

  return lines.join("\n");
}

/**
 * The draw is the reading's twin - the same (date, sign) seeded both, and the
 * app prints them on the same page. The Oracle gets it so the two agree
 * instead of being strangers. It names none of it: a reading that says "the
 * Tower, reversed" turns the page into a glossary.
 */
function drawLines(packet: Packet): string {
  const { tarot, hexagram, rune } = packet.draw;
  return `
The draw sitting beside this reading (PRIVATE. Let exactly ONE of these
quietly agree with the aspect you chose, so the page feels like a single
object. Never name a card, a hexagram or a rune; never mention tarot, the I
Ching or runes at all):
- ${tarot.name}${tarot.reversed ? ", reversed" : ""}: ${tarot.meaning}
- Hexagram ${hexagram.number}, ${hexagram.name}: ${hexagram.judgment}
- ${rune.name}: ${rune.meaning}
`;
}

/**
 * The measured sky: real instruments reading the real heliosphere, arriving
 * on their own schedule. Mood only - quoting a Kp index in a horoscope is
 * precisely the jargon the identity forbids.
 */
function measuredLines(packet: Packet): string {
  const { weather, visitor } = packet.live;
  const bits: string[] = [];
  if (weather) {
    bits.push(
      `the geomagnetic field is ${weather.label} (Kp ${weather.kp})${
        weather.flux ? `, solar flux ${weather.flux}` : ""
      }`,
    );
  }
  if (visitor) {
    bits.push(
      `the nearest tracked visitor is ${visitor.name}, passing ${visitor.lunarDistance} lunar distances out at ${visitor.relativeVelocityKmS} km/s`,
    );
  }
  if (!bits.length) return "";
  return `
Measured right now by instruments, not computed: ${bits.join("; ")}. This is
real weather in a real sky. Let it set the temperature of the writing - a
storming field is not a quiet day - but never quote a number, never name an
instrument or a rock.
`;
}

// Each (date, sign) gets its own everyday-image territory, so twelve
// independent generations don't all reach for the same kitchen drawer.
const IMAGE_DOMAINS = [
  "kitchens and cooking",
  "gardens and growing things",
  "weather, wind and rain",
  "streets, traffic and journeys",
  "music and sound",
  "tools, repairs and workbenches",
  "the sea, rivers and tides",
  "letters, phones and messages",
  "maps, doors and thresholds",
  "light, lamps and shadows",
  "clothes, pockets and drawers",
  "games, sport and play",
];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// The audit found 76% of the prompt byte-identical across every reading, and
// IDENTITY prescribes one three-act shape: observation, theme, fridge line.
// The taste rules stay exactly as written (Pablo's call) — what rotates is the
// STRUCTURE the taste is poured into, seeded on date+sign so twelve readings
// on one night are built four different ways.
const SHAPES = [
  `STRUCTURE - observation first: open on the small true thing itself, plainly,
before any meaning is attached. Let the meaning arrive late and almost by
accident. Do not open with "When" or "There is".`,
  `STRUCTURE - question first: open with a real question the reader might
actually be sitting with, then spend the reading circling it honestly without
fully answering it. The last line may answer it sideways.`,
  `STRUCTURE - scene first: open mid-moment, a specific small scene already in
progress, second person. Stay inside it longer than feels comfortable, then
step out once, briefly, near the end.`,
  `STRUCTURE - flat declarative: open with a short blunt sentence of fact.
Build in short sentences that accumulate rather than elaborate. No subordinate
clause in the first three sentences. Earn one longer sentence at the close.`,
];

// Signs differed from each other by almost nothing in the old prompt: the
// voice register came from the planetary hour, which is shared by all twelve
// on a given night. Element and modality are per-sign and already written.
const ELEMENT_LEAN: Record<ZodiacSign["element"], string> = {
  fire:
    "This sign runs hot and forward: keep the verbs active, the sentences moving.",
  earth:
    "This sign runs tactile and slow: stay concrete, name real objects, resist abstraction.",
  air:
    "This sign runs quick and associative: let the thought turn once mid-paragraph.",
  water:
    "This sign runs by feel and undertow: let what is unsaid carry weight.",
};

const MODALITY_LEAN: Record<ZodiacSign["modality"], string> = {
  cardinal: "It is a starter, so the reading can push.",
  fixed:
    "It is a holder, so the reading should respect what it will not move on.",
  mutable: "It is a shifter, so the reading can leave an edge unresolved.",
};

/** Exported for scripts/oracle-audit.ts — the audit measures the real prompt. */
export function buildPrompt(
  packet: Packet,
  sign: ZodiacSign,
  recentJournal: string[],
): string {
  const seed = hashStr(`${packet.dateKey}:${sign.name}`);
  const domain = IMAGE_DOMAINS[seed % IMAGE_DOMAINS.length];
  // a different hash slice, so shape and domain don't move in lockstep
  const structure = SHAPES[(seed >>> 7) % SHAPES.length];
  const span = packet.period === "daily"
    ? "today"
    : packet.period === "weekly"
    ? "this week"
    : "this month";
  const shape = packet.period === "daily"
    ? "120 to 160 words, one or two paragraphs."
    : packet.period === "weekly"
    ? "180 to 240 words, two paragraphs - a week has room, let the thought develop."
    : "250 to 320 words, two or three paragraphs - a month is an arc, give it a slow build and a place to land.";
  return `${IDENTITY}

${HOUR_REGISTER[packet.hour.ruler] ?? HOUR_REGISTER.Sun} ${
    ELEMENT_LEAN[sign.element]
  } ${MODALITY_LEAN[sign.modality]}

Write the reading for ${span} for ${sign.name.toUpperCase()} (ruled by
${sign.rulingPlanet}; this sign reads as ${sign.keywords.join(", ")}).

Below is the actual computed sky for this sign. Build the reading around the
TODAY line - that is what is true for this reader right now. The UNDERNEATH
line is the long weather behind it: let it colour the reading, never lead it.
Ignore everything else here; never recite any of it:

${transitLines(packet)}

Moon: ${packet.moon.phase}, ${packet.moon.illum}% lit, ${packet.moon.age} days into the cycle, in ${packet.signSky.moonSign}.${
    packet.moonArc
      ? `\n${packet.moonArc} - write the arc, not the snapshot.`
      : ""
  }

This reading is one text, read at the same moment in both hemispheres and in
every climate. Never name a date, a month, a season or a holiday, and never
assume the reader's weather, temperature or daylight. Weather may appear only
as a passing condition - a wind, rain on a window - never as a marker of the
time of year.
${measuredLines(packet)}${drawLines(packet)}
Draw your opening image from the world of ${domain} (loosely - any small true
thing from that territory).
${
    recentJournal.length
      ? `\nYour recent readings opened with: ${
        recentJournal.join("; ")
      }. Choose a different kind of opening image AND a different grammatical
shape from those - vary how the sentence itself is built, not just what it
points at. Six of twelve readings opening "When you..." is a tic, however
different the pictures are.\n`
      : ""
  }
${structure}

${shape} Normal sentence capitalisation. End on something the reader carries.`;
}

/** Sanitize model output — multi-byte punctuation breaks terminal box padding. */
function sanitize(text: string): string {
  const clean = text
    .replace(/\s*—\s*|\s*–\s*/g, " - ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  // backstop for the model's occasional all-lowercase aesthetic roll
  return clean.replace(
    /(^|[.!?]\s+)([a-z])/g,
    (_m, pre, ch) => pre + ch.toUpperCase(),
  );
}

/**
 * Ask the Oracle to interpret the packet. Returns null on ANY failure —
 * the caller falls back to composeFallback(). Never throws.
 */
export async function speakReading(
  packet: Packet,
  sign: ZodiacSign,
  recentJournal: string[] = [],
): Promise<string | null> {
  const key = Deno.env.get("STARGRAM_GEMINI_KEY");
  if (!key) return null;

  // full moon = hot and vivid, new moon = cool and spare. The moon is shared
  // by all twelve signs on a night, so a per-sign jitter keeps them from being
  // sampled at the identical setting as well as prompted alike.
  const jitter = ((hashStr(`${packet.dateKey}:${sign.name}:temp`) % 17) - 8) /
    100;
  const temperature = Math.max(
    0.6,
    Math.min(1.3, 0.75 + (packet.moon.illum / 100) * 0.45 + jitter),
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: buildPrompt(packet, sign, recentJournal) }],
          }],
          generationConfig: {
            temperature: Math.round(temperature * 100) / 100,
            // Gemini 3.x bills thinking tokens as output. thinkingLevel is the
            // 3.x control; thinkingBudget is the legacy 2.5 one and 400s if both
            // are sent. Knob: minimal | low | medium | high.
            thinkingConfig: { thinkingLevel: "medium" },
            // a ceiling, not a target: we only pay for what is generated, and a
            // tight cap truncates mid-thought and returns no text at all
            maxOutputTokens: 8192,
          },
        }),
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.warn(`Oracle voice: Gemini returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    // the 2026-08-08 law: verify content, not transaction — and a mid-air
    // truncation is not a reading
    if (typeof text !== "string" || !text.trim()) return null;
    const clean = sanitize(text);
    if (clean.length < 40 || !/[.!?"]$/.test(clean)) return null;
    return clean;
  } catch (error) {
    console.warn("Oracle voice failed, falling back:", error);
    return null;
  }
}

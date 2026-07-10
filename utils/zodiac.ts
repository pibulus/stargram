// ===================================================================
// ZODIAC UTILITIES - Sign data, emojis, and localStorage
// ===================================================================

export interface ZodiacSign {
  name: string;
  emoji: string;
  dates: string;
  element: "fire" | "earth" | "air" | "water";
  bio: string;
  modality: "cardinal" | "fixed" | "mutable";
  rulingPlanet: string;
  signatureMove: string;
  recharge: string;
  motto: string;
  keywords: string[];
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  {
    name: "aries",
    emoji: "♈",
    dates: "Mar 21 - Apr 19",
    element: "fire",
    bio:
      "Impulsive firestarter who thrives on first moves, dares, and impossible bets.",
    modality: "cardinal",
    rulingPlanet: "Mars",
    signatureMove:
      "Launch-first gambits, fearless sprints, and unfiltered hype.",
    recharge: "High-intensity sweat, spicy noodles, and emergency road trips.",
    motto: "If it scares me, it belongs to me.",
    keywords: ["spark plug", "initiator", "brash", "combat mode"],
  },
  {
    name: "taurus",
    emoji: "♉",
    dates: "Apr 20 - May 20",
    element: "earth",
    bio:
      "Earthy sensualist—loyal, grounded, and forever chasing tactile luxury.",
    modality: "fixed",
    rulingPlanet: "Venus",
    signatureMove:
      "Slow-burn mastery, sustainable stacks, velvet rope standards.",
    recharge: "Garden snacks, deep naps, and playlists on plush speakers.",
    motto: "Consistency is the ultimate flex.",
    keywords: ["builder", "steadfast", "sensual", "collector"],
  },
  {
    name: "gemini",
    emoji: "♊",
    dates: "May 21 - Jun 20",
    element: "air",
    bio:
      "Split-signal trickster who lives for gossip, beta builds, and hot takes.",
    modality: "mutable",
    rulingPlanet: "Mercury",
    signatureMove: "DM storms, meme diplomacy, and ten tabs of context.",
    recharge: "Night walks, dual playlists, and chaotic group chats.",
    motto: "Why pick one storyline when I can run three?",
    keywords: ["social modem", "translator", "curious", "restless"],
  },
  {
    name: "cancer",
    emoji: "♋",
    dates: "Jun 21 - Jul 22",
    element: "water",
    bio:
      "Lunar caretaker with moods synced to the tides and playlists full of feelings.",
    modality: "cardinal",
    rulingPlanet: "Moon",
    signatureMove:
      "Soft power strategy, emotional firewalls, psychic homebases.",
    recharge: "Salt baths, handwritten letters, and late-night cooking.",
    motto: "Protect the vibe and the vibe returns the favor.",
    keywords: ["nurturer", "intuitive", "protective", "shell-core"],
  },
  {
    name: "leo",
    emoji: "♌",
    dates: "Jul 23 - Aug 22",
    element: "fire",
    bio: "Solar performer, gold-trim maximalist, and perpetual hype engine.",
    modality: "fixed",
    rulingPlanet: "Sun",
    signatureMove:
      "Spotlight takeovers, loyalty oaths, and glittered rollouts.",
    recharge:
      "Stage lights, luxury brunches, and a camera roll of compliments.",
    motto: "If it's not legendary, why bother?",
    keywords: ["royalty", "radiant", "dramatic", "protector"],
  },
  {
    name: "virgo",
    emoji: "♍",
    dates: "Aug 23 - Sep 22",
    element: "earth",
    bio:
      "Precision analyst turning chaos into clean checklists and clever systems.",
    modality: "mutable",
    rulingPlanet: "Mercury",
    signatureMove:
      "Debugging the universe, spreadsheet spells, herbal diagnostics.",
    recharge:
      "Color-coded planning, forest walks, and journaling in serif fonts.",
    motto: "Refine, align, repeat.",
    keywords: ["editor", "healer", "strategist", "craftsperson"],
  },
  {
    name: "libra",
    emoji: "♎",
    dates: "Sep 23 - Oct 22",
    element: "air",
    bio: "Charm dealer balancing beauty, diplomacy, and curated drama.",
    modality: "cardinal",
    rulingPlanet: "Venus",
    signatureMove:
      "Peace treaties, gallery curation, couture-level negotiation.",
    recharge: "Museums, silk pajamas, and texting three crushes at once.",
    motto: "Balance is couture.",
    keywords: ["diplomat", "designer", "harmonizer", "flirt"],
  },
  {
    name: "scorpio",
    emoji: "♏",
    dates: "Oct 23 - Nov 21",
    element: "water",
    bio:
      "Psychic hacker who reads motives, guards secrets, and loves transformation.",
    modality: "fixed",
    rulingPlanet: "Pluto",
    signatureMove:
      "Shadow dives, loyalty blood-pacts, and controlled detonations.",
    recharge:
      "Subterranean playlists, intense therapy, and candlelit plotting.",
    motto: "Transform or be transformed.",
    keywords: ["alchemist", "detective", "intense", "phoenix"],
  },
  {
    name: "sagittarius",
    emoji: "♐",
    dates: "Nov 22 - Dec 21",
    element: "fire",
    bio:
      "Galactic explorer chasing horizons, spicy takes, and unfiltered freedom.",
    modality: "mutable",
    rulingPlanet: "Jupiter",
    signatureMove: "Passport roulette, blunt sermons, and cosmic improv.",
    recharge: "Bonfire debates, long-haul flights, and philosophy podcasts.",
    motto: "Truth over tact, journey over destination.",
    keywords: ["seeker", "comedian", "optimist", "wanderer"],
  },
  {
    name: "capricorn",
    emoji: "♑",
    dates: "Dec 22 - Jan 19",
    element: "earth",
    bio:
      "Saturnian builder stacking legacy moves, status mountains, and spreadsheets.",
    modality: "cardinal",
    rulingPlanet: "Saturn",
    signatureMove:
      "Five-year plans, stealth power plays, and midnight productivity.",
    recharge: "Cabin retreats, vintage whiskey, and deleting unnecessary apps.",
    motto: "Longevity is the loudest flex.",
    keywords: ["architect", "strategist", "stoic", "executive"],
  },
  {
    name: "aquarius",
    emoji: "♒",
    dates: "Jan 20 - Feb 18",
    element: "air",
    bio:
      "Future-wave inventor remixing systems with rebellious humanitarian code.",
    modality: "fixed",
    rulingPlanet: "Uranus",
    signatureMove:
      "Open-source revolutions, data rebellions, and group experiments.",
    recharge: "Solo think tanks, sci-fi marathons, and rooftop stargazing.",
    motto: "Break the format, keep the people.",
    keywords: ["innovator", "alien", "visionary", "activist"],
  },
  {
    name: "pisces",
    emoji: "♓",
    dates: "Feb 19 - Mar 20",
    element: "water",
    bio:
      "Dream-diver translating cosmic feelings into art, playlists, and poetry.",
    modality: "mutable",
    rulingPlanet: "Neptune",
    signatureMove:
      "Sleep-paralysis art drops, psychic empathy, and oceanic daydreams.",
    recharge:
      "Float tanks, watercolor journaling, and dissolving in film soundtracks.",
    motto: "Feel it all, remix it into light.",
    keywords: ["mystic", "artist", "empath", "mermaid"],
  },
];

const STORAGE_KEY = "cosmic_zodiac_sign";

/**
 * Get zodiac sign data by name
 */
export function getZodiacSign(name: string): ZodiacSign | undefined {
  return ZODIAC_SIGNS.find((sign) => sign.name === name.toLowerCase());
}

/**
 * Save user's zodiac sign to localStorage
 */
export function saveZodiacSign(sign: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, sign.toLowerCase());
}

/**
 * Get user's saved zodiac sign from localStorage
 */
export function getSavedZodiacSign(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

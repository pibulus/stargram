#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * STARGRAM TERMINAL STATS
 * Query PostHog analytics and render beautiful ASCII charts
 *
 * Usage: deno run --allow-net --allow-env scripts/stats.ts [days]
 * Example: deno run --allow-net --allow-env scripts/stats.ts 7
 */

const POSTHOG_KEY = Deno.env.get("POSTHOG_KEY");
const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://us.i.posthog.com";

if (!POSTHOG_KEY) {
  console.error("❌ POSTHOG_KEY not set in environment");
  Deno.exit(1);
}

const DAYS = parseInt(Deno.args[0] || "7");

// ASCII bar chart generator
function renderBar(value: number, max: number, width = 20): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

interface PostHogEvent {
  event: string;
  timestamp: string;
  properties?: {
    format?: string;
    to_theme?: string;
    effect?: string;
    sign?: string;
    period?: string;
  };
}

// Fetch events from PostHog
async function getEvents(): Promise<PostHogEvent[]> {
  const url = `${POSTHOG_HOST}/api/projects/@current/events?limit=1000`;

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${POSTHOG_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`PostHog API error: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.results as PostHogEvent[]) || [];
}

// Analyze events
async function getStats() {
  console.log("📊 Fetching analytics from PostHog...\n");

  try {
    const events = await getEvents();

    // Filter to last N days
    const cutoff = Date.now() - (DAYS * 24 * 60 * 60 * 1000);
    const recentEvents = events.filter((e: PostHogEvent) =>
      new Date(e.timestamp).getTime() > cutoff
    );

    // Count by event type
    const eventCounts: Record<string, number> = {};
    const exportFormats: Record<string, number> = {};
    const themes: Record<string, number> = {};
    const effects: Record<string, number> = {};
    const signs: Record<string, number> = {};
    const periods: Record<string, number> = {};

    for (const event of recentEvents) {
      const eventName = event.event;
      eventCounts[eventName] = (eventCounts[eventName] || 0) + 1;

      // Track specific properties
      if (eventName === "export_clicked" && event.properties?.format) {
        const format = event.properties.format;
        exportFormats[format] = (exportFormats[format] || 0) + 1;
      }

      if (eventName === "theme_changed" && event.properties?.to_theme) {
        const theme = event.properties.to_theme;
        themes[theme] = (themes[theme] || 0) + 1;
      }

      if (eventName === "horoscope_viewed" && event.properties?.effect) {
        const effect = event.properties.effect;
        if (effect !== "none") {
          effects[effect] = (effects[effect] || 0) + 1;
        }
      }

      if (eventName === "horoscope_viewed" && event.properties?.sign) {
        const sign = event.properties.sign;
        signs[sign] = (signs[sign] || 0) + 1;
      }

      if (eventName === "horoscope_viewed" && event.properties?.period) {
        const period = event.properties.period;
        periods[period] = (periods[period] || 0) + 1;
      }
    }

    return {
      totalEvents: recentEvents.length,
      eventCounts,
      exportFormats,
      themes,
      effects,
      signs,
      periods,
    };
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    Deno.exit(1);
  }
}

// Render the dashboard
async function renderDashboard() {
  const stats = await getStats();

  console.clear();

  // Header
  console.log(
    "\x1b[95m╔══════════════════════════════════════════════════════════╗\x1b[0m",
  );
  console.log(
    "\x1b[95m║\x1b[0m  \x1b[1m🔮 STARGRAM ANALYTICS\x1b[0m                                  \x1b[95m║\x1b[0m",
  );
  console.log(
    "\x1b[95m║\x1b[0m  \x1b[93mLast ${DAYS} days\x1b[0m                                             \x1b[95m║\x1b[0m",
  );
  console.log(
    "\x1b[95m╚══════════════════════════════════════════════════════════╝\x1b[0m",
  );
  console.log();

  // Total events
  console.log(
    `\x1b[96m📊 Total Events:\x1b[0m \x1b[1m${stats.totalEvents}\x1b[0m`,
  );
  console.log();

  // Event breakdown
  console.log("\x1b[96m🎯 Event Types:\x1b[0m");
  const maxEventCount = Math.max(...Object.values(stats.eventCounts));
  for (
    const [event, count] of Object.entries(stats.eventCounts).sort((a, b) =>
      b[1] - a[1]
    )
  ) {
    const bar = renderBar(count, maxEventCount, 30);
    console.log(`  ${bar} \x1b[93m${count}\x1b[0m ${event}`);
  }
  console.log();

  // Export formats
  if (Object.keys(stats.exportFormats).length > 0) {
    console.log("\x1b[96m💾 Export Formats:\x1b[0m");
    const maxExportCount = Math.max(...Object.values(stats.exportFormats));
    for (
      const [format, count] of Object.entries(stats.exportFormats).sort((
        a,
        b,
      ) => b[1] - a[1])
    ) {
      const bar = renderBar(count, maxExportCount, 20);
      console.log(`  ${bar} \x1b[92m${count}\x1b[0m ${format}`);
    }
    console.log();
  }

  // Popular themes
  if (Object.keys(stats.themes).length > 0) {
    console.log("\x1b[96m🎨 Popular Themes:\x1b[0m");
    const topThemes = Object.entries(stats.themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxThemeCount = Math.max(...topThemes.map((t) => t[1]));
    for (const [theme, count] of topThemes) {
      const bar = renderBar(count, maxThemeCount, 20);
      console.log(`  ${bar} \x1b[95m${count}\x1b[0m ${theme}`);
    }
    console.log();
  }

  // Popular signs
  if (Object.keys(stats.signs).length > 0) {
    console.log("\x1b[96m♈ Popular Signs:\x1b[0m");
    const topSigns = Object.entries(stats.signs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxSignCount = Math.max(...topSigns.map((s) => s[1]));
    for (const [sign, count] of topSigns) {
      const bar = renderBar(count, maxSignCount, 20);
      console.log(`  ${bar} \x1b[94m${count}\x1b[0m ${sign}`);
    }
    console.log();
  }

  // Popular periods
  if (Object.keys(stats.periods).length > 0) {
    console.log("\x1b[96m🗓️  Reading Periods:\x1b[0m");
    const maxPeriodCount = Math.max(...Object.values(stats.periods));
    for (
      const [period, count] of Object.entries(stats.periods).sort((a, b) =>
        b[1] - a[1]
      )
    ) {
      const bar = renderBar(count, maxPeriodCount, 20);
      console.log(`  ${bar} \x1b[94m${count}\x1b[0m ${period}`);
    }
    console.log();
  }

  // Popular effects
  if (Object.keys(stats.effects).length > 0) {
    console.log("\x1b[96m🌈 Color Effects:\x1b[0m");
    const topEffects = Object.entries(stats.effects)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const maxEffectCount = Math.max(...topEffects.map((e) => e[1]));
    for (const [effect, count] of topEffects) {
      const bar = renderBar(count, maxEffectCount, 20);
      console.log(`  ${bar} \x1b[91m${count}\x1b[0m ${effect}`);
    }
    console.log();
  }

  console.log(
    "\x1b[90m─────────────────────────────────────────────────────────\x1b[0m",
  );
  console.log(`\x1b[90mGenerated: ${new Date().toLocaleString()}\x1b[0m`);
}

// Run it
renderDashboard();

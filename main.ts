/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

// Load a local .env when present. On Deno Deploy env vars come from the
// platform and there is no .env file, so this must never be fatal — the
// vars in .env.example (PostHog analytics) are all optional by design.
import { load } from "$std/dotenv/mod.ts";
await load({ export: true, allowEmptyValues: true, examplePath: null });

import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

// The nightly rite: 15:33 UTC = 1:33am Melbourne. The Oracle divines all 12
// readings once and locks them into KV for the day.
// ponytail: fixed UTC drifts to 2:33am during Melbourne DST — cosmically acceptable
if (typeof Deno.cron === "function") {
  try {
    Deno.cron("nightly divination", "33 15 * * *", async () => {
      const { nightlyRite } = await import("./utils/oracle/ritual.ts");
      await nightlyRite();
    });
  } catch (error) {
    console.warn(
      "Oracle cron not registered (dev without --unstable-cron):",
      error,
    );
  }
}

await start(manifest, config);

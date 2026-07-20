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

await start(manifest, config);

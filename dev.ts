#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

// Non-fatal .env load: the example-file vars are optional (see main.ts).
import { loadSync } from "$std/dotenv/mod.ts";
loadSync({ export: true, examplePath: null });

await dev(import.meta.url, "./main.ts", config);

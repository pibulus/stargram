#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";

// Non-fatal .env load: the example-file vars are optional (see main.ts).
import { load } from "$std/dotenv/mod.ts";
await load({ export: true, allowEmptyValues: true, examplePath: null });

await dev(import.meta.url, "./main.ts", config);

import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
  server: {
    hostname: Deno.env.get("HOST") ?? "0.0.0.0",
    port: Number(Deno.env.get("PORT") ?? "8002"),
  },
  plugins: [tailwind()],
});

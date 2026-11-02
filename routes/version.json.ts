// ===================================================================
// /version.json — make the artifact answer for itself.
// ===================================================================
// Deno Deploy runs main.ts directly and never executes `deno task build`, so
// no build-time stamp can exist on this lane (see fleet memory
// version_stamp_standard.md). What the runtime CAN report is the deployment
// id, which changes on every deploy — enough to prove "the thing serving this
// request is a new build", never enough to name the commit by itself.
//
// So this route is honest about both halves:
//   commit         only when a build system handed one over (COMMIT_REF,
//                  GIT_COMMIT_REF), else the local git HEAD, else "unknown"
//   deploymentId   the live proof on Deploy
// Anything that upgrades "unknown" into "current" is lying.

import { FreshContext } from "$fresh/server.ts";

interface Stamp {
  commit: string;
  built: string;
  deploymentId: string | null;
  app: string;
}

function localGitCommit(): string {
  try {
    const result = new Deno.Command("git", {
      args: ["rev-parse", "HEAD"],
      stdout: "piped",
      stderr: "null",
    }).outputSync();
    if (!result.success) return "unknown";
    return new TextDecoder().decode(result.stdout).trim().slice(0, 12) ||
      "unknown";
  } catch {
    return "unknown";
  }
}

function readCommit(): string {
  const fromBuild = Deno.env.get("COMMIT_REF") ||
    Deno.env.get("GIT_COMMIT_REF") ||
    Deno.env.get("DENO_DEPLOY_COMMIT");
  if (fromBuild) return fromBuild.slice(0, 12);
  // On Deploy there is no working tree, so this falls straight through.
  return localGitCommit();
}

export const handler = (_req: Request, _ctx: FreshContext): Response => {
  const stamp: Stamp = {
    commit: readCommit(),
    built: new Date().toISOString(),
    deploymentId: Deno.env.get("DENO_DEPLOYMENT_ID") ?? null,
    app: "stargram",
  };
  return new Response(JSON.stringify(stamp), {
    headers: {
      "Content-Type": "application/json",
      // A cached stamp is a ghost stamp — the bug the stamp exists to catch.
      "Cache-Control": "no-store, max-age=0",
    },
  });
};

// ===================================================================
// ORACLE · sigil.ts — every reading mints an unrepeatable talisman
// ===================================================================
// Peter de Jong attractor, parameters drawn from the reading's own hash:
// the day literally shapes its own glyph. Ported from plenum-engine.
// Rendered as braille text (~1.6KB) — terminal-native, KV/API friendly,
// colored by CSS on the client. Zero deps, canvas-free, deterministic.

const W = 36, H = 18; // braille chars → 72 × 72 dots (square grid)
const DOTS_W = W * 2, DOTS_H = H * 4;

interface Attractor {
  a: number;
  b: number;
  c: number;
  d: number;
}

function paramsFromHash(hashHex: string): Attractor {
  const byte = (i: number) => parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
  const p = (i: number) => (byte(i) / 255) * 6 - 3; // [-3, 3]
  return { a: p(0), b: p(1), c: p(2), d: p(3) };
}

function iterate(at: Attractor, n: number): Float64Array {
  const grid = new Float64Array(DOTS_W * DOTS_H);
  let x = 0.1, y = 0.1;
  for (let i = 0; i < n; i++) {
    const nx = Math.sin(at.a * y) - Math.cos(at.b * x);
    const ny = Math.sin(at.c * x) - Math.cos(at.d * y);
    x = nx;
    y = ny;
    if (i < 100) continue; // burn-in
    const px = Math.floor(((x + 2) / 4) * DOTS_W);
    const py = Math.floor(((y + 2) / 4) * DOTS_H);
    if (px >= 0 && px < DOTS_W && py >= 0 && py < DOTS_H) {
      grid[py * DOTS_W + px]++;
    }
  }
  return grid;
}

function liveliness(grid: Float64Array): number {
  let cells = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] > 0) cells++;
  return cells / grid.length;
}

// find a living attractor; degenerate params get re-derived by rotating the
// hash. Deterministic: same hash always walks the same path to the same glyph.
function mintGrid(hashHex: string): Float64Array {
  let h = hashHex;
  let best: { grid: Float64Array; score: number } | null = null;
  for (let tries = 0; tries < 16; tries++) {
    const at = paramsFromHash(h);
    const grid = iterate(at, 40000);
    const live = liveliness(grid);
    if (live > 0.05 && live < 0.85) return grid;
    const score = live > 0.85 ? 0.85 - (live - 0.85) : live;
    if (!best || score > best.score) best = { grid, score };
    h = h.slice(2) + h.slice(0, 2); // rotate a byte, try again
  }
  return best!.grid;
}

// braille dot bit positions within a 2x4 cell
const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

function renderBraille(grid: Float64Array): string {
  const lines: string[] = [];
  for (let cy = 0; cy < H; cy++) {
    let line = "";
    for (let cx = 0; cx < W; cx++) {
      let bits = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          if (grid[(cy * 4 + dy) * DOTS_W + (cx * 2 + dx)] > 0) {
            bits |= BRAILLE_BITS[dy][dx];
          }
        }
      }
      line += bits === 0 ? " " : String.fromCharCode(0x2800 + bits);
    }
    lines.push(line.trimEnd());
  }
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.join("\n");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Mint the day+sign's unique braille talisman from any seed string. */
export async function mintSigil(seed: string): Promise<string> {
  const hash = await sha256Hex(seed);
  return renderBraille(mintGrid(hash));
}

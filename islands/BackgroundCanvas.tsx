// ===================================================================
// BACKGROUND CANVAS - Swirl effect with simplex noise
// ===================================================================
// Based on ambient webpage backgrounds by Jack Rugile

import { useEffect, useRef } from "preact/hooks";
import { createNoise3D } from "simplex-noise";

const TAU = Math.PI * 2;
const rand = (n: number) => Math.random() * n;
const randRange = (n: number) => n - rand(2 * n);
const fadeInOut = (t: number, m: number) => {
  const hm = 0.5 * m;
  return Math.abs((t + hm) % m - hm) / hm;
};
const lerp = (n1: number, n2: number, speed: number) =>
  (1 - speed) * n1 + speed * n2;

export default function BackgroundCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Configuration
    const prefersReducedMotion = globalThis.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const particleCount = prefersReducedMotion
      ? 0
      : globalThis.innerWidth < 640
      ? 280
      : 700;
    const particlePropCount = 9;
    const particlePropsLength = particleCount * particlePropCount;
    let rangeY = 400; // Updated dynamically on resize for broader spread
    const baseTTL = 50;
    const rangeTTL = 150;
    const baseSpeed = 0.1;
    const rangeSpeed = 2;
    const baseRadius = 1;
    const rangeRadius = 4;
    const baseHue = 220;
    const rangeHue = 100;
    const noiseSteps = 8;
    const xOff = 0.00125;
    const yOff = 0.00125;
    const zOff = 0.0005;
    const backgroundColor = "rgba(6, 6, 8, 1)"; // Deep dark off black

    // Create canvases. canvasGlow is a quarter-res copy of the particle
    // pass: compositing it back up gives a soft bloom from bilinear scaling
    // alone, replacing the per-frame ctx.filter blur that ate whole cores.
    const canvasA = document.createElement("canvas");
    const canvasB = document.createElement("canvas");
    const canvasGlow = document.createElement("canvas");
    canvasB.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;
    container.appendChild(canvasB);

    const ctxA = canvasA.getContext("2d");
    const ctxB = canvasB.getContext("2d", { alpha: false });
    const ctxGlow = canvasGlow.getContext("2d");
    if (!ctxA || !ctxB || !ctxGlow) return;

    // Initialize
    const particleProps = new Float32Array(particlePropsLength);
    const simplex = createNoise3D();
    let tick = 0;
    let animationId: number;
    const center: number[] = [];

    const resize = () => {
      const { innerWidth, innerHeight } = window;

      canvasA.width = innerWidth;
      canvasA.height = innerHeight;
      ctxA.drawImage(canvasB, 0, 0);

      canvasB.width = innerWidth;
      canvasB.height = innerHeight;
      ctxB.drawImage(canvasA, 0, 0);

      canvasGlow.width = Math.max(1, innerWidth >> 2);
      canvasGlow.height = Math.max(1, innerHeight >> 2);

      // Resizing resets context state, so re-pin the stroke style here
      // instead of save/restore-ing around every particle draw.
      ctxA.lineCap = "round";

      center[0] = 0.5 * canvasA.width;
      center[1] = 0.5 * canvasA.height;

      rangeY = Math.max(canvasA.height * 0.6, 420);
    };

    const initParticle = (i: number) => {
      const x = rand(canvasA.width);
      const y = center[1] + randRange(rangeY);
      const vx = 0;
      const vy = 0;
      const life = 0;
      const ttl = baseTTL + rand(rangeTTL);
      const speed = baseSpeed + rand(rangeSpeed);
      const radius = baseRadius + rand(rangeRadius);
      const hue = baseHue + rand(rangeHue);

      particleProps.set([x, y, vx, vy, life, ttl, speed, radius, hue], i);
    };

    const drawParticle = (
      x: number,
      y: number,
      x2: number,
      y2: number,
      life: number,
      ttl: number,
      radius: number,
      hue: number,
    ) => {
      ctxA.lineWidth = radius;
      ctxA.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
      ctxA.beginPath();
      ctxA.moveTo(x, y);
      ctxA.lineTo(x2, y2);
      ctxA.stroke();
    };

    const checkBounds = (x: number, y: number) => {
      return (
        x > canvasA.width ||
        x < 0 ||
        y > canvasA.height ||
        y < 0
      );
    };

    const updateParticle = (i: number) => {
      const i2 = 1 + i, i3 = 2 + i, i4 = 3 + i, i5 = 4 + i;
      const i6 = 5 + i, i7 = 6 + i, i8 = 7 + i, i9 = 8 + i;

      const x = particleProps[i];
      const y = particleProps[i2];
      const n = simplex(x * xOff, y * yOff, tick * zOff) * noiseSteps * TAU;
      const vx = lerp(particleProps[i3], Math.cos(n), 0.5);
      const vy = lerp(particleProps[i4], Math.sin(n), 0.5);
      let life = particleProps[i5];
      const ttl = particleProps[i6];
      const speed = particleProps[i7];
      const x2 = x + vx * speed;
      const y2 = y + vy * speed;
      const radius = particleProps[i8];
      const hue = particleProps[i9];

      drawParticle(x, y, x2, y2, life, ttl, radius, hue);

      life++;

      particleProps[i] = x2;
      particleProps[i2] = y2;
      particleProps[i3] = vx;
      particleProps[i4] = vy;
      particleProps[i5] = life;

      if (checkBounds(x, y) || life > ttl) {
        initParticle(i);
      }
    };

    const drawParticles = () => {
      for (let i = 0; i < particlePropsLength; i += particlePropCount) {
        updateParticle(i);
      }
    };

    const renderGlow = () => {
      // Downscale once, additively upscale twice: the scaling blur stands in
      // for the old blur(8px)/blur(4px) filters, the double draw for their
      // brightness(200%).
      ctxGlow.clearRect(0, 0, canvasGlow.width, canvasGlow.height);
      ctxGlow.drawImage(canvasA, 0, 0, canvasGlow.width, canvasGlow.height);
      ctxB.drawImage(canvasGlow, 0, 0, canvasA.width, canvasA.height);
      ctxB.drawImage(canvasGlow, 0, 0, canvasA.width, canvasA.height);
    };

    const renderToScreen = () => {
      ctxB.drawImage(canvasA, 0, 0);
    };

    // Render at 30fps with TWO sim steps per drawn frame: swirl speed and
    // trail density stay identical, but the full-screen clear/fill/glow
    // composites — the expensive half — happen half as often. An ambient
    // background has no business drawing at display rate (120Hz ProMotion
    // was paying quadruple).
    const FRAME_MS = 1000 / 30;
    let lastFrame = 0;

    const draw = (now: number) => {
      animationId = requestAnimationFrame(draw);
      if (now - lastFrame < FRAME_MS - 1) return;
      lastFrame = now;

      ctxA.clearRect(0, 0, canvasA.width, canvasA.height);

      ctxB.globalCompositeOperation = "source-over";
      ctxB.fillStyle = backgroundColor;
      ctxB.fillRect(0, 0, canvasA.width, canvasA.height);
      ctxB.globalCompositeOperation = "lighter";

      tick++;
      drawParticles();
      tick++;
      drawParticles();

      renderGlow();
      renderToScreen();
    };

    // Initialize particles
    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      initParticle(i);
    }

    resize();
    globalThis.addEventListener("resize", resize);

    if (prefersReducedMotion) {
      ctxB.fillStyle = backgroundColor;
      ctxB.fillRect(0, 0, canvasA.width, canvasA.height);
    } else {
      draw(performance.now());
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      globalThis.removeEventListener("resize", resize);
      container.removeChild(canvasB);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      class="fixed inset-0 pointer-events-none"
      style="z-index: 1; opacity: 1;"
    />
  );
}

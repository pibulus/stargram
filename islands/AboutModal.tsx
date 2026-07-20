import { signal } from "@preact/signals";
import { ModalShell } from "../components/modal/ModalShell.tsx";

/**
 * 🎸 About Modal Component
 *
 * Showcase modal explaining Stargram's purpose and Pablo's rapid dev approach.
 * Machinery (Escape, backdrop close, scroll-lock, focus trap, animations)
 * lives in the vendored chassis ModalShell — this file is signal + skin only.
 *
 * Built by Pablo for SoftStack apps 🎸
 */

// Global signal for modal state
export const aboutModalOpen = signal(false);

// Helper to open modal from anywhere
export function openAboutModal() {
  aboutModalOpen.value = true;
}

// Helper to close modal
export function closeAboutModal() {
  aboutModalOpen.value = false;
}

export function AboutModal() {
  return (
    <ModalShell
      open={aboutModalOpen.value}
      onClose={closeAboutModal}
      labelledby="about-modal-title"
      maxWidth="48rem"
      showClose={false}
    >
      {/* Header */}
      <div
        class="p-4 sm:p-6 border-4 border-b-0 rounded-t-3xl"
        style="background-color: var(--color-secondary, #1a1f3a); border-color: var(--color-border, #a78bfa)"
      >
        <div class="flex items-start justify-between mb-2">
          <h2
            id="about-modal-title"
            class="text-2xl sm:text-3xl font-bold font-mono"
            style="color: var(--color-text, #e0e7ff)"
          >
            About STARGRAM ✨
          </h2>
          <button
            type="button"
            onClick={closeAboutModal}
            class="-mt-2 -mr-2 w-11 h-11 shrink-0 flex items-center justify-center text-2xl sm:text-3xl leading-none font-bold transition-transform hover:scale-110"
            style="color: var(--color-text, #e0e7ff)"
            aria-label="Close about dialog"
          >
            ×
          </button>
        </div>
        <p
          class="text-base sm:text-lg font-mono font-bold"
          style="color: var(--color-accent, #f0abfc)"
        >
          Horoscopes styled as cosmic art 🌙
        </p>
      </div>

      {/* Content */}
      <div
        class="p-4 sm:p-8 border-4 rounded-b-3xl shadow-brutal-xl space-y-4 sm:space-y-6"
        style="background-color: var(--color-base, #0a0e27); border-color: var(--color-border, #a78bfa)"
      >
        {/* Story */}
        <p
          class="text-base sm:text-lg leading-relaxed"
          style="color: var(--color-text, #e0e7ff)"
        >
          Your horoscope as shareable cosmic art. Because your daily guidance
          deserves to look as good as it reads.
        </p>

        {/* What it's for */}
        <div
          class="py-4 px-4 border-2 rounded-xl space-y-2"
          style="background-color: var(--color-secondary, #1a1f3a); border-color: var(--color-border, #a78bfa)"
        >
          <p
            class="text-sm sm:text-base font-medium"
            style="color: var(--color-text, #e0e7ff)"
          >
            Pick your sign. Get daily, weekly, or monthly readings typed out
            live, tuned to real sky signals. Share the vibe.
          </p>
          <p
            class="text-sm sm:text-base font-medium"
            style="color: var(--color-text, #e0e7ff)"
          >
            Quick, free, no fuss.
          </p>
          <p
            class="text-sm sm:text-base font-medium pt-2"
            style="color: var(--color-accent, #f0abfc)"
          >
            ✨ Real astrologer wisdom, zero AI
          </p>
        </div>

        {/* Links */}
        <div class="pt-2">
          <p
            class="text-sm font-medium mb-3 text-center"
            style="color: var(--color-text, #e0e7ff)"
          >
            Check out more of my work:
          </p>
          <div class="flex flex-wrap gap-3 justify-center">
            <a
              href="https://pibul.us"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2 border-3 rounded-lg font-mono font-bold transition-all hover:scale-105 shadow-brutal-sm"
              style="background-color: var(--color-accent, #FF69B4); color: var(--color-base, #FAF9F6); border-color: var(--color-border, #0A0A0A)"
            >
              🌐 Portfolio
            </a>
            <a
              href="https://github.com/pibulus"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2 border-3 rounded-lg font-mono font-bold transition-all hover:scale-105 shadow-brutal-sm"
              style="background-color: var(--color-secondary, #FFE5B4); color: var(--color-text, #0A0A0A); border-color: var(--color-border, #0A0A0A)"
            >
              💻 GitHub
            </a>
          </div>
        </div>

        {/* Footer */}
        <div
          class="pt-4 text-center border-t-2"
          style="border-color: var(--color-border, #0A0A0A)"
        >
          <p
            class="text-xs opacity-60"
            style="color: var(--color-text, #0A0A0A)"
          >
            Made in Melbourne with care 🎸
          </p>
        </div>
      </div>

      {/* Footer hint */}
      <div class="text-center mt-4">
        <p
          class="text-xs font-mono opacity-60"
          style="color: var(--color-text, #e0e7ff)"
        >
          Tap outside or press ESC to close
        </p>
      </div>

      <style>
        {`
          .shadow-brutal-xl {
            box-shadow: 12px 12px 0px var(--color-border, #0A0A0A);
          }

          .shadow-brutal-sm {
            box-shadow: 4px 4px 0px var(--color-border, #0A0A0A);
          }
        `}
      </style>
    </ModalShell>
  );
}

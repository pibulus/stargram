import { signal } from "@preact/signals";
import { ModalShell } from "../components/modal/ModalShell.tsx";
import { sounds } from "../utils/sounds.ts";
import { openKofiModal } from "./KofiModal.tsx";

/**
 * 🎸 About Modal Component
 *
 * Terminal-styled about card — same CRT language as WelcomeModal, kept
 * short and chill. Machinery (Escape, backdrop close, scroll-lock, focus
 * trap, animations) lives in the vendored chassis ModalShell — this file
 * is signal + skin only.
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
      maxWidth="38rem"
      showClose={false}
    >
      {/* Terminal shell */}
      <div
        class="relative border-[3px] sm:border-4 rounded-[18px] sm:rounded-3xl overflow-hidden"
        style="background: rgba(2, 4, 12, 0.98); border-color: #8B5CF6; box-shadow: 0 0 45px rgba(139, 92, 246, 0.3), 0 25px 90px rgba(0,0,0,0.7), inset 0 0 80px rgba(0,0,0,0.6);"
      >
        {/* Terminal title bar */}
        <div
          class="flex items-center gap-3 px-4 sm:px-6 py-3 border-b-3"
          style="border-color: rgba(139, 92, 246, 0.3); background: rgba(0, 0, 0, 0.9);"
        >
          <div class="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => {
                sounds.click();
                closeAboutModal();
              }}
              onMouseEnter={() => sounds.hover()}
              class="w-3 h-3 rounded-full bg-[#ff5f56] transition-all hover:scale-125 hover:shadow-[0_0_8px_#ff5f56] active:scale-90 focus:outline-none cursor-pointer"
              title="Close modal"
              aria-label="Close about dialog"
            />
            <button
              type="button"
              onClick={() => {
                sounds.click();
                closeAboutModal();
              }}
              onMouseEnter={() => sounds.hover()}
              class="w-3 h-3 rounded-full bg-[#ffbd2e] transition-all hover:scale-125 hover:shadow-[0_0_8px_#ffbd2e] active:scale-90 focus:outline-none cursor-pointer"
              title="Close modal"
              aria-label="Close about dialog"
            />
            <span class="w-3 h-3 rounded-full bg-[#27c93f] opacity-60" />
          </div>
          <div
            class="flex-1 text-sm font-mono tracking-wider uppercase"
            style="color: #8B5CF6;"
          >
            ~/cosmic/about.txt
          </div>
          <button
            type="button"
            onClick={() => {
              sounds.click();
              closeAboutModal();
            }}
            class="-mr-2 w-11 h-11 shrink-0 flex items-center justify-center text-2xl leading-none font-mono font-bold transition-transform hover:scale-110"
            style="color: #8B5CF6;"
            aria-label="Close about dialog"
          >
            ×
          </button>
        </div>

        {/* Terminal content */}
        <div class="p-4 sm:p-8 space-y-5 font-mono">
          <h2
            id="about-modal-title"
            class="text-xl sm:text-2xl font-bold tracking-[0.2em] uppercase"
            style="color: #8B5CF6; text-shadow: 0 0 12px rgba(139, 92, 246, 0.6);"
          >
            About Stargram
          </h2>

          <p class="text-sm" style="color: rgba(139, 92, 246, 0.9);">
            <span style="color: #00FF41;">$</span>{" "}
            Your horoscope as cosmic terminal art
          </p>

          {/* The download */}
          <div
            class="p-4 border-2 rounded-xl space-y-2"
            style="background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3);"
          >
            <p class="text-sm font-bold text-center" style="color: #EC4899;">
              COSMIC DOWNLOAD
            </p>
            <p
              class="text-xs sm:text-sm text-center"
              style="color: rgba(139, 92, 246, 0.85);"
            >
              Pulled fresh from the sky each night at 1:33am — real planetary
              math, moon phase, a card, a rune, a sigil. One reading per day,
              same sky for everyone.
            </p>
          </div>

          {/* Footer */}
          <div
            class="pt-4 flex flex-col items-center gap-3 border-t-2"
            style="border-color: rgba(139, 92, 246, 0.25);"
          >
            <p class="text-xs" style="color: rgba(139, 92, 246, 0.6);">
              Made by Pablo 🎸
            </p>
            <button
              type="button"
              onClick={() => {
                sounds.click();
                closeAboutModal();
                openKofiModal();
              }}
              onMouseEnter={() => sounds.hover()}
              class="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] border-3 rounded-xl font-mono font-bold text-sm transition-all hover:scale-105 active:scale-95"
              style="background: rgba(139, 92, 246, 0.2); color: #8B5CF6; border-color: #8B5CF6; box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);"
            >
              ☕ Buy me a coffee
            </button>
          </div>
        </div>

        {/* CRT scanlines overlay */}
        <div
          class="absolute inset-0 pointer-events-none rounded-[18px] sm:rounded-3xl"
          style="background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 2px); opacity: 0.3;"
        />
      </div>

      {/* Footer hint */}
      <div class="text-center mt-4">
        <p
          class="text-xs font-mono opacity-60"
          style="color: rgba(139, 92, 246, 0.9);"
        >
          Tap outside or press ESC to close
        </p>
      </div>
    </ModalShell>
  );
}

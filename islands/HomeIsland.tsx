// ===================================================================
// HOME ISLAND - Main interactive container with unified terminal
// ===================================================================

import ZodiacPicker from "./ZodiacPicker.tsx";

export default function HomeIsland() {
  return (
    <>
      {/* Main Content - Centered both vertically and horizontally */}
      <main
        id="main-content"
        class="w-full min-h-[100dvh] flex items-start justify-center overflow-x-hidden px-0 py-0 sm:py-4"
        style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
      >
        <div class="w-full flex justify-center">
          <ZodiacPicker />
        </div>
      </main>

      {/* Footer - Floating at bottom */}
      {
        /* <footer
        class="fixed bottom-0 left-0 right-0 py-2 sm:py-3 z-40 border-t-4"
        style="
          background-color: #0a0a0a;
          border-color: var(--color-border, #a855f7);
        "
      >
        <div class="max-w-4xl mx-auto px-3 sm:px-4">
          <div class="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <AboutLink label="Made by Pablo 🎸" />
            <KofiButton size="sm" label="☕ Support" />
          </div>
        </div>
      </footer> */
      }
    </>
  );
}

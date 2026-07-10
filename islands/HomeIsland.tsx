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
    </>
  );
}

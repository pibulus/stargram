// ===================================================================
// HOME ISLAND - Main interactive container with unified terminal
// ===================================================================

import ZodiacPicker from "./ZodiacPicker.tsx";

export default function HomeIsland() {
  return (
    <>
      {
        /* The picker owns the viewport box (safe areas included) — main just
          hands it the full remaining height. */
      }
      <main
        id="main-content"
        class="w-full flex-1 min-h-0 flex overflow-hidden"
      >
        <ZodiacPicker />
      </main>
    </>
  );
}

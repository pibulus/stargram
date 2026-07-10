import HomeIsland from "../islands/HomeIsland.tsx";
import BackgroundCanvas from "../islands/BackgroundCanvas.tsx";
import { AboutModal } from "../islands/AboutModal.tsx";
import { WelcomeModal } from "../islands/WelcomeModal.tsx";
import WelcomeChecker from "../islands/WelcomeChecker.tsx";

export default function Home() {
  return (
    <div
      class="min-h-[100dvh] w-full flex flex-col relative overflow-x-hidden"
      style="background: linear-gradient(135deg, #0a0a0a 0%, #151515 50%, #0a0a0a 100%);"
    >
      {/* Animated canvas background */}
      <BackgroundCanvas />

      <div class="relative z-10 flex flex-col flex-1 w-full">
        {/* Global atmospheric effects removed for crisper terminal */}

        {/* Check if first visit and show welcome */}
        <WelcomeChecker />

        {/* First-visit welcome modal */}
        <WelcomeModal />

        {/* About modal (opened from the terminal title bar) */}
        <AboutModal />

        {/* Main interactive content */}
        <HomeIsland />
      </div>
    </div>
  );
}

import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";
import { sounds } from "../utils/sounds.ts";

/**
 * ✨ Terminal-styled Welcome Modal
 * First-open modal with cosmic CRT terminal aesthetic
 */

// Global signal for modal state
export const welcomeModalOpen = signal(false);

// Track the animation timeout globally
let closeAnimationTimeout: number | null = null;

// Check if user has seen welcome before
const WELCOME_SEEN_KEY = "stargram-welcome-seen";

export function checkWelcomeStatus() {
  if (typeof localStorage !== "undefined") {
    const seen = localStorage.getItem(WELCOME_SEEN_KEY);
    if (!seen) {
      welcomeModalOpen.value = true;
    }
  }
}

export function markWelcomeSeen() {
  const modal = document.querySelector(".animate-terminal-in");
  if (modal) {
    modal.classList.add("animate-terminal-out");
  }

  // Clear any existing timeout
  if (closeAnimationTimeout !== null) {
    clearTimeout(closeAnimationTimeout);
  }

  closeAnimationTimeout = setTimeout(() => {
    welcomeModalOpen.value = false;

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(WELCOME_SEEN_KEY, "true");
    }
    closeAnimationTimeout = null;
  }, 400) as unknown as number;
}

export function WelcomeModal() {
  const isOpen = welcomeModalOpen.value;

  const handleStart = () => {
    sounds.openPortal();
    markWelcomeSeen();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        sounds.click();
        markWelcomeSeen();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      if (closeAnimationTimeout !== null) {
        clearTimeout(closeAnimationTimeout);
        closeAnimationTimeout = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto px-3 sm:px-4"
        style="background: rgba(0, 0, 0, 0.92); backdrop-filter: blur(18px); padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: max(1rem, env(safe-area-inset-bottom));"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        {/* Terminal Modal */}
        <div
          class="relative w-full max-w-2xl animate-terminal-in terminal-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Terminal shell */}
          <div
            class="border-[3px] sm:border-4 rounded-[18px] sm:rounded-3xl overflow-y-auto"
            style="background: rgba(2, 4, 12, 0.98); border-color: #8B5CF6; box-shadow: 0 0 45px rgba(139, 92, 246, 0.3), 0 25px 90px rgba(0,0,0,0.7), inset 0 0 80px rgba(0,0,0,0.6);"
          >
            {/* Terminal title bar */}
            <div
              class="flex items-center gap-3 px-6 py-3 border-b-3"
              style="border-color: rgba(139, 92, 246, 0.3); background: rgba(0, 0, 0, 0.9);"
            >
              <div class="flex gap-2">
                <span class="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span class="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span class="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div
                class="text-sm font-mono tracking-wider uppercase"
                style="color: #8B5CF6;"
              >
                ~/cosmic/welcome.sh
              </div>
            </div>

            {/* Terminal content */}
            <div class="p-4 sm:p-8 space-y-5 sm:space-y-6">
              {/* ASCII Title */}
              <pre
                class="font-mono text-center text-[5px] min-[390px]:text-[5.7px] sm:text-sm leading-tight mb-3 sm:mb-4 overflow-hidden"
                style="color: #8B5CF6; text-shadow: 0 0 12px rgba(139, 92, 246, 0.6);"
              >{`
███████╗████████╗ █████╗ ██████╗  ██████╗ ██████╗  █████╗ ███╗   ███╗
██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔════╝ ██╔══██╗██╔══██╗████╗ ████║
███████╗   ██║   ███████║██████╔╝██║  ███╗██████╔╝███████║██╔████╔██║
╚════██║   ██║   ██╔══██║██╔══██╗██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║
███████║   ██║   ██║  ██║██║  ██║╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
              `}</pre>

              <div class="space-y-4 font-mono">
                <p class="text-sm" style="color: rgba(139, 92, 246, 0.9);">
                  <span style="color: #00FF41;">$</span>{" "}
                  Horoscopes that look as good as they read
                </p>

                {/* AI-Free Badge */}
                <div
                  class="p-4 border-2 rounded-xl"
                  style="background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3);"
                >
                  <p
                    class="text-sm font-bold text-center"
                    style="color: #EC4899;"
                  >
                    🚫🤖 100% AI-FREE ZONE
                  </p>
                  <p
                    class="text-xs text-center mt-2"
                    style="color: rgba(139, 92, 246, 0.8);"
                  >
                    Real horoscopes from actual astrologers.<br />
                    Downloaded from the stars. No robots.
                  </p>
                </div>

                {/* Features as terminal commands */}
                <div class="space-y-2 text-xs sm:text-sm">
                  <p style="color: rgba(139, 92, 246, 0.7);">
                    <span style="color: #00FF41;">{">"}</span>{" "}
                    Pick your sign (daily/weekly/monthly)
                  </p>
                  <p style="color: rgba(139, 92, 246, 0.7);">
                    <span style="color: #00FF41;">{">"}</span>{" "}
                    Watch cosmic typewriter effect
                  </p>
                  <p style="color: rgba(139, 92, 246, 0.7);">
                    <span style="color: #00FF41;">{">"}</span>{" "}
                    Get random lucky numbers + vibes
                  </p>
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={handleStart}
                  onMouseEnter={() => sounds.hover()}
                  class="w-full min-h-[52px] px-5 sm:px-6 py-4 border-3 rounded-xl font-mono font-bold text-sm sm:text-base transition-all hover:scale-105 active:scale-95"
                  style="background: rgba(139, 92, 246, 0.2); color: #8B5CF6; border-color: #8B5CF6; box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);"
                  aria-label="Start exploring horoscopes"
                >
                  <span style="color: #00FF41;">{">"}</span>CHECK THE STARS
                </button>

                {/* Footer */}
                <p
                  class="text-center text-xs"
                  style="color: rgba(139, 92, 246, 0.6);"
                >
                  Quick. Free. Yours.
                </p>
              </div>
            </div>
          </div>

          {/* CRT scanlines overlay */}
          <div class="terminal-scanlines" />
        </div>
      </div>

      <style>
        {`
          @keyframes terminal-in {
            0% {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
              filter: brightness(1.5);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
              filter: brightness(1);
            }
          }

          @keyframes terminal-out {
            0% {
              opacity: 1;
              transform: scale(1);
            }
            100% {
              opacity: 0;
              transform: scale(0.98);
            }
          }

          .animate-terminal-in {
            animation: terminal-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }

          .animate-terminal-out {
            animation: terminal-out 0.3s ease-out forwards;
          }

          .terminal-modal {
            position: relative;
          }

          .terminal-scanlines {
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: repeating-linear-gradient(
              0deg,
              rgba(255, 255, 255, 0.03),
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px,
              transparent 2px
            );
            opacity: 0.3;
            border-radius: 1.5rem;
          }
        `}
      </style>
    </>
  );
}

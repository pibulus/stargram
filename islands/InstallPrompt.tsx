// ===================================================================
// INSTALL PROMPT - Terminal-styled PWA prompt
// ===================================================================

// deno-lint-ignore-file no-explicit-any

import { useEffect, useRef, useState } from "preact/hooks";
import { sounds } from "../utils/sounds.ts";

const PROMPT_DISMISSED_KEY = "stargram-install-dismissed";
const PROMPT_DELAY_MS = 10000; // Show after 10 seconds

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem(PROMPT_DISMISSED_KEY)) {
      return;
    }

    // Check if already installed
    if (globalThis.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isiOS);
    setIsAndroid(isAndroidDevice);

    // iOS: Show after delay
    if (isiOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
        sounds.success();
      }, PROMPT_DELAY_MS);

      return () => clearTimeout(timer);
    }

    // Android/Chrome: Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;

      setTimeout(() => {
        setShowPrompt(true);
        sounds.success();
      }, PROMPT_DELAY_MS);
    };

    globalThis.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    return () => {
      globalThis.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstall = async () => {
    if (isAndroid && deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === "accepted") {
        sounds.success();
      }

      deferredPromptRef.current = null;
      setShowPrompt(false);
      localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    }
  };

  const handleDismiss = () => {
    sounds.click();
    setShowPrompt(false);
    localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
  };

  if (!showPrompt) return null;

  return (
    <div
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-40 animate-terminal-slide"
      style="max-width: 380px; margin-left: auto; margin-right: auto;"
    >
      <div
        class="border-3 rounded-2xl overflow-hidden terminal-prompt"
        style="background: rgba(2, 4, 12, 0.98); border-color: #00FF41; box-shadow: 0 0 25px rgba(0, 255, 65, 0.3), 0 12px 40px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.6);"
      >
        {/* Terminal title bar */}
        <div
          class="flex items-center justify-between px-4 py-2 border-b-2"
          style="border-color: rgba(0, 255, 65, 0.2); background: rgba(0, 0, 0, 0.9);"
        >
          <div class="flex items-center gap-2">
            <div class="flex gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span class="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span class="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
            </div>
            <span
              class="text-xs font-mono uppercase tracking-wider"
              style="color: #00FF41;"
            >
              ~/install.sh
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            class="w-6 h-6 flex items-center justify-center rounded font-bold transition-all hover:scale-110"
            style="color: rgba(0, 255, 65, 0.6);"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div class="p-4 space-y-3 font-mono">
          <div class="flex items-start gap-2">
            <span class="text-lg">✨</span>
            <div>
              <p class="text-sm font-bold" style="color: #00FF41;">
                <span style="color: rgba(0, 255, 65, 0.6);">$</span>{" "}
                Install to Home Screen
              </p>
              <p class="text-xs mt-1" style="color: rgba(0, 255, 65, 0.7);">
                Get horoscopes with one tap!
              </p>
            </div>
          </div>

          {isIOS
            ? (
              // iOS Instructions
              <div
                class="p-3 rounded-xl text-xs space-y-2"
                style="background: rgba(0, 255, 65, 0.05); border: 1px solid rgba(0, 255, 65, 0.2);"
              >
                <p class="font-bold" style="color: rgba(0, 255, 65, 0.9);">
                  {">"} HOW TO INSTALL:
                </p>
                <ol
                  class="space-y-1 pl-4 list-decimal"
                  style="color: rgba(0, 255, 65, 0.7);"
                >
                  <li>
                    Tap Share button
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      class="inline mx-1"
                      style="opacity: 0.8;"
                    >
                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
                    </svg>
                  </li>
                  <li>Tap "Add to Home Screen"</li>
                  <li>Tap "Add"</li>
                </ol>
              </div>
            )
            : (
              // Android Install Button
              <button
                type="button"
                onClick={handleInstall}
                class="w-full px-4 py-3 border-2 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                style="background: rgba(0, 255, 65, 0.1); color: #00FF41; border-color: #00FF41; box-shadow: 0 0 12px rgba(0, 255, 65, 0.3);"
              >
                <span style="color: rgba(0, 255, 65, 0.7);">{">"}</span>{" "}
                INSTALL APP
              </button>
            )}

          <p class="text-xs text-center" style="color: rgba(0, 255, 65, 0.5);">
            Free • No ads • Works offline
          </p>
        </div>

        {/* Scanlines */}
        <div class="terminal-scanlines" />
      </div>

      <style>
        {`
        @keyframes terminal-slide {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-terminal-slide {
          animation: terminal-slide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .terminal-prompt {
          position: relative;
        }

        .terminal-scanlines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.02),
            rgba(255, 255, 255, 0.02) 1px,
            transparent 1px,
            transparent 2px
          );
          opacity: 0.4;
          border-radius: 1rem;
        }
        `}
      </style>
    </div>
  );
}

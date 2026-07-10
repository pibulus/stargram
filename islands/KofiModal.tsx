import { useEffect } from "preact/hooks";
import { signal } from "@preact/signals";

/**
 * 💰 Custom Ko-fi Modal Component
 *
 * Beautiful donation modal that keeps users ON your site.
 * Opens Ko-fi in an embedded iframe instead of redirecting away.
 *
 * FEATURES:
 * - Stays on your site (no redirect)
 * - Custom animation + design
 * - Backdrop blur effect
 * - Escape key to close
 * - Mobile responsive
 * - Fully themed
 *
 * USAGE:
 * ```tsx
 * import { KofiModal, openKofiModal } from "../components/KofiModal.tsx";
 *
 * // Add modal to your app/layout
 * <KofiModal kofiUsername="yourhandle" />
 *
 * // Open from anywhere
 * <button onClick={() => openKofiModal()}>☕ Buy me a coffee</button>
 * ```
 *
 * CUSTOMIZATION:
 * - Change kofiUsername to your Ko-fi handle
 * - Adjust modal size/styling
 * - Customize close button
 * - Add celebration on donation complete (webhook needed)
 *
 * Built by Pablo for SoftStack apps 🎸
 */

// Global signal for modal state
export const kofiModalOpen = signal(false);

// Helper to open modal from anywhere
export function openKofiModal() {
  kofiModalOpen.value = true;
}

// Helper to close modal
export function closeKofiModal() {
  kofiModalOpen.value = false;
}

interface KofiModalProps {
  kofiUsername: string; // Your Ko-fi username (without @)
  title?: string;
  description?: string;
}

export function KofiModal({
  kofiUsername,
  title = "Support this project ☕",
  description = "Your support keeps this free and open for everyone!",
}: KofiModalProps) {
  const isOpen = kofiModalOpen.value;

  useEffect(() => {
    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeKofiModal();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto px-3 sm:px-4"
        style="background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px); padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: max(1rem, env(safe-area-inset-bottom));"
        onClick={closeKofiModal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Modal */}
        <div
          class="relative w-full max-w-2xl my-auto animate-modal-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            class="p-4 sm:p-6 border-4 border-b-0 rounded-t-3xl"
            style="background-color: var(--color-secondary, #FFE5B4); border-color: var(--color-border, #0A0A0A)"
          >
            <div class="flex items-start justify-between mb-2">
              <h2
                class="text-xl sm:text-2xl font-bold font-mono"
                style="color: var(--color-text, #0A0A0A)"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={closeKofiModal}
                class="-mt-2 -mr-2 w-11 h-11 shrink-0 flex items-center justify-center text-3xl leading-none font-bold transition-transform hover:scale-110"
                style="color: var(--color-text, #0A0A0A)"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p
              class="text-sm font-mono opacity-80"
              style="color: var(--color-text, #0A0A0A)"
            >
              {description}
            </p>
          </div>

          {/* Ko-fi Embed */}
          <div
            class="border-4 rounded-b-3xl overflow-hidden shadow-brutal-xl"
            style="background-color: var(--color-base, #FAF9F6); border-color: var(--color-border, #0A0A0A)"
          >
            <iframe
              src={`https://ko-fi.com/${kofiUsername}/?hidefeed=true&widget=true&embed=true`}
              style="border: none; width: 100%; height: min(600px, calc(100dvh - 15rem)); min-height: 320px; background: transparent;"
              title="Ko-fi donation"
            />
          </div>

          {/* Footer hint */}
          <div class="text-center mt-4">
            <p
              class="text-xs font-mono opacity-60"
              style="color: var(--color-text, #0A0A0A)"
            >
              Tap outside or press ESC to close
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes modal-in {
            0% {
              opacity: 0;
              transform: scale(0.95) translateY(20px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          .animate-modal-in {
            animation: modal-in 0.3s ease-out forwards;
          }

          .shadow-brutal-xl {
            box-shadow: 12px 12px 0px var(--color-border, #0A0A0A);
          }
        `}
      </style>
    </>
  );
}

/**
 * 🔘 Ko-fi Button Component
 *
 * Beautiful button that opens the modal (doesn't redirect).
 *
 * USAGE:
 * ```tsx
 * import { KofiButton } from "../components/KofiModal.tsx";
 *
 * <KofiButton />
 * ```
 */

interface KofiButtonProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
}

export function KofiButton({
  label = "☕ Buy me a coffee",
  size = "md",
  variant = "primary",
}: KofiButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  const variantStyles = {
    primary:
      "background-color: var(--color-accent, #FF69B4); color: var(--color-base, #FAF9F6);",
    secondary:
      "background-color: var(--color-secondary, #FFE5B4); color: var(--color-text, #0A0A0A);",
  };

  return (
    <button
      type="button"
      onClick={openKofiModal}
      class={`inline-flex items-center gap-2 border-3 rounded-xl font-mono font-bold shadow-brutal transition-all hover:scale-105 ${
        sizeClasses[size]
      }`}
      style={`${
        variantStyles[variant]
      } border-color: var(--color-border, #0A0A0A)`}
    >
      <span>{label}</span>
    </button>
  );
}

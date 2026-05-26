// deno-lint-ignore-file react-no-danger

// ===================================================================
// TYPED WRITER - Uses typed.js library with keyboard sounds
// ===================================================================

import { useEffect, useRef } from "preact/hooks";
import Typed from "typed.js";
import SimpleTypeWriter from "../utils/simple-typewriter.js";
import { sounds } from "../utils/sounds.ts";

interface TypedWriterProps {
  /** Plain text to type */
  text: string;
  /** HTML content to type (takes priority) */
  htmlText?: string;
  /** Speed in ms per character */
  speed?: number;
  /** Enable typing animation */
  enabled?: boolean;
  /** Callback when complete */
  onComplete?: () => void;
  /** Whether to append blinking cursor on completion */
  showCompletionCursor?: boolean;
  /** Reserve the final text box while typing to avoid layout growth */
  reserveLayout?: boolean;
  /** CSS class */
  className?: string;
  /** Inline styles */
  style?: string;
}

export function TypedWriter({
  text,
  htmlText,
  speed = 60,
  enabled = true,
  onComplete,
  showCompletionCursor = true,
  reserveLayout = false,
  className = "",
  style = "",
}: TypedWriterProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<Typed | null>(null);
  const soundsRef = useRef<SimpleTypeWriter | null>(null);
  const lastContentRef = useRef<string>(""); // Track what we last typed
  const trailTimeoutRef = useRef<number | null>(null);
  const speedIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize keyboard sounds (quieter)
    if (!soundsRef.current) {
      soundsRef.current = new SimpleTypeWriter({
        volume: 0.08, // Quieter
        enabled: true,
        pack: "cherry-mx-black",
      });
      soundsRef.current.init();
    }

    return () => {
      if (soundsRef.current) {
        soundsRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;

    // Don't restart if content hasn't changed
    const contentKey = `${text}|${htmlText || ""}`;
    if (lastContentRef.current === contentKey && typedRef.current) {
      // Same content, don't restart typing
      return;
    }
    lastContentRef.current = contentKey;

    // Cleanup previous instance
    if (typedRef.current) {
      typedRef.current.destroy();
    }

    if (speedIntervalRef.current) {
      clearInterval(speedIntervalRef.current);
      speedIntervalRef.current = null;
    }

    if (trailTimeoutRef.current) {
      clearTimeout(trailTimeoutRef.current);
      trailTimeoutRef.current = null;
    }

    if (!enabled) {
      // Show full text immediately
      elementRef.current.innerHTML = htmlText || text;
      if (onComplete) onComplete();
      return;
    }

    // Watch for DOM changes to play sounds and add natural pauses
    let lastLength = 0;
    let lastChar = "";
    const observer = new MutationObserver(() => {
      if (!elementRef.current || !typedRef.current) return;

      const currentText = elementRef.current.textContent || "";
      const newLength = currentText.length;

      // Character was added
      if (newLength > lastLength) {
        const newChar = currentText[newLength - 1] || "a";

        // Play keyboard sound
        if (soundsRef.current) {
          soundsRef.current.play({
            key: newChar,
            keyCode: newChar.charCodeAt(0),
          });
        }
        sounds.transmissionTick(newChar);

        if (elementRef.current) {
          elementRef.current.classList.remove("typing-trail");
          void elementRef.current.offsetWidth;
          elementRef.current.classList.add("typing-trail");
          if (trailTimeoutRef.current) {
            clearTimeout(trailTimeoutRef.current);
          }
          trailTimeoutRef.current = globalThis.setTimeout(() => {
            if (elementRef.current) {
              elementRef.current.classList.remove("typing-trail");
            }
            trailTimeoutRef.current = null;
          }, 320);
        }

        // Add natural pause after punctuation
        if (lastChar === "." || lastChar === "!" || lastChar === "?") {
          typedRef.current.stop();
          setTimeout(() => {
            if (typedRef.current) {
              typedRef.current.start();
            }
          }, 400); // Pause for 400ms after sentence end
        }

        lastChar = newChar;
      }

      lastLength = newLength;
    });

    observer.observe(elementRef.current, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    // Start typing with typed.js - with human-like variation
    typedRef.current = new Typed(elementRef.current, {
      strings: [htmlText || text],
      typeSpeed: speed,
      showCursor: false,
      contentType: htmlText ? "html" : "text",
      // Add randomness to typing speed (±30ms variation)
      onBegin: (self: Typed) => {
        // Override typeSpeed dynamically for human feel
        const originalSpeed = speed;
        speedIntervalRef.current = globalThis.setInterval(() => {
          if (self && !self.typingComplete) {
            // Vary speed between 70-130% of base speed
            const variation = 0.7 + Math.random() * 0.6;
            const typedInstance = self as Typed & { typeSpeed: number };
            typedInstance.typeSpeed = Math.floor(originalSpeed * variation);
          }
        }, 100);
      },
      onComplete: () => {
        observer.disconnect();
        if (speedIntervalRef.current) {
          clearInterval(speedIntervalRef.current);
          speedIntervalRef.current = null;
        }

        if (showCompletionCursor) {
          sounds.transmissionComplete();
        }

        // Add persistent blinking cursor after typing completes
        if (showCompletionCursor && elementRef.current) {
          const cursor = document.createElement("span");
          cursor.className = "blinking-cursor";
          cursor.textContent = "█";
          cursor.style.cssText =
            "color: #00FF41; font-size: inherit; font-weight: 900; margin-left: 0;";
          elementRef.current.appendChild(cursor);
        }

        if (onComplete) onComplete();
      },
    });

    return () => {
      observer.disconnect();
      if (typedRef.current) {
        typedRef.current.destroy();
      }
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }
      if (trailTimeoutRef.current) {
        clearTimeout(trailTimeoutRef.current);
        trailTimeoutRef.current = null;
      }
    };
  }, [text, htmlText, speed, enabled]);

  if (reserveLayout && enabled) {
    const reserveStyle = [
      style,
      "position: relative; width: 100%; min-width: 0;",
    ].filter(Boolean).join(" ");

    return (
      <div className={className} style={reserveStyle}>
        {htmlText
          ? (
            <div
              aria-hidden="true"
              style="visibility: hidden; pointer-events: none; width: 100%; min-width: 0;"
              dangerouslySetInnerHTML={{ __html: htmlText }}
            />
          )
          : (
            <div
              aria-hidden="true"
              style="visibility: hidden; pointer-events: none; width: 100%; min-width: 0;"
            >
              {text}
            </div>
          )}
        <div
          ref={elementRef}
          style="position: absolute; inset: 0; width: 100%; min-width: 0;"
        />
      </div>
    );
  }

  return <div ref={elementRef} className={className} style={style} />;
}

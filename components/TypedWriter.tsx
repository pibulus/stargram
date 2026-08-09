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
  /** Human typing rhythm: sentence/clause pauses + per-word hesitation.
   * Leave off for ASCII art, where pauses read as stalls. */
  humanize?: boolean;
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
  humanize = false,
  reserveLayout = false,
  className = "",
  style = "",
}: TypedWriterProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<Typed | null>(null);
  const soundsRef = useRef<SimpleTypeWriter | null>(null);
  const lastContentRef = useRef<string>(""); // Track what we last typed
  const pauseTimeoutRef = useRef<number | null>(null);
  const readerTookScrollRef = useRef(false); // Reader scrolled away mid-typing

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

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }

    if (!enabled) {
      // Show full text immediately
      elementRef.current.innerHTML = htmlText || text;
      if (onComplete) onComplete();
      return;
    }

    // Let the reader take over the scroll: wheel/touch means intent, and we
    // resume following only once they come back near the caret.
    readerTookScrollRef.current = false;
    const scrollHost = elementRef.current.closest(".overflow-y-auto");
    const markReaderScroll = () => {
      if (!scrollHost || !elementRef.current) return;
      const parentBottom = scrollHost.getBoundingClientRect().bottom;
      const caretBottom = elementRef.current.getBoundingClientRect().bottom;
      readerTookScrollRef.current = caretBottom - parentBottom > 120;
    };
    scrollHost?.addEventListener("wheel", markReaderScroll, { passive: true });
    scrollHost?.addEventListener("touchmove", markReaderScroll, {
      passive: true,
    });

    // Follow the caret at most once per frame: the observer fires per typed
    // character, and measuring layout that often is what made typing janky.
    let followQueued = false;
    const followCaret = () => {
      followQueued = false;
      if (!scrollHost || !elementRef.current || readerTookScrollRef.current) {
        return;
      }
      const parentBottom = scrollHost.getBoundingClientRect().bottom;
      const caretBottom = elementRef.current.getBoundingClientRect().bottom;
      const overshoot = caretBottom - parentBottom + 24;
      if (overshoot > 0) {
        scrollHost.scrollTop += overshoot;
      }
    };

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

        // Follow the caret: nudge the scroller only once typing passes the
        // fold, so content above (like the ASCII title) stays in view.
        if (!followQueued) {
          followQueued = true;
          requestAnimationFrame(followCaret);
        }

        // Human rhythm: pause at real boundaries only. The whitespace guard
        // means a boundary is confirmed by the character AFTER the mark —
        // so "..." or "2026.08" never stutter, but a sentence end breathes.
        // The resume has to be cancellable: without it, switching period
        // mid-sentence leaves a timer that calls start() on a destroyed
        // instance — or worse, on the replacement that's already typing.
        if (humanize) {
          const isWhitespace = /\s/.test(newChar);
          let pauseMs = 0;
          if (isWhitespace && /[.!?]/.test(lastChar)) {
            pauseMs = 550 + Math.random() * 250; // sentence lands, breathe
          } else if (isWhitespace && /[,;:—]/.test(lastChar)) {
            pauseMs = 180 + Math.random() * 120; // clause tick
          }

          if (pauseMs > 0) {
            const paused = typedRef.current;
            paused.stop();
            if (pauseTimeoutRef.current) {
              clearTimeout(pauseTimeoutRef.current);
            }
            pauseTimeoutRef.current = globalThis.setTimeout(() => {
              pauseTimeoutRef.current = null;
              if (typedRef.current === paused) {
                paused.start();
              }
            }, pauseMs);
          } else {
            // Between pauses the pace itself wobbles like fingers: quick
            // within words, an occasional held breath before a new one.
            const typedInstance = typedRef.current as Typed & {
              typeSpeed: number;
            };
            typedInstance.typeSpeed = isWhitespace && Math.random() < 0.05
              ? speed + 90 + Math.random() * 90
              : Math.max(4, Math.round(speed * (0.7 + Math.random() * 0.5)));
          }
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

    // Start typing with typed.js — rhythm lives in the observer above
    typedRef.current = new Typed(elementRef.current, {
      strings: [htmlText || text],
      typeSpeed: speed,
      showCursor: false,
      contentType: htmlText ? "html" : "text",
      onComplete: () => {
        observer.disconnect();

        if (showCompletionCursor) {
          sounds.transmissionComplete();
        }

        // Add persistent blinking cursor after typing completes. It lands
        // INSIDE the last line span — the colorized lines are display:block,
        // so appending to the container would drop it onto its own row.
        if (showCompletionCursor && elementRef.current) {
          const cursor = document.createElement("span");
          cursor.className = "cursor-blink";
          cursor.textContent = "█";
          cursor.style.cssText =
            "color: #00FF41; font-size: inherit; font-weight: 900; margin-left: 0.45ch;";
          const host = elementRef.current.lastElementChild ??
            elementRef.current;
          host.appendChild(cursor);
        }

        if (onComplete) onComplete();
      },
    });

    return () => {
      observer.disconnect();
      scrollHost?.removeEventListener("wheel", markReaderScroll);
      scrollHost?.removeEventListener("touchmove", markReaderScroll);
      if (typedRef.current) {
        typedRef.current.destroy();
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    };
  }, [text, htmlText, speed, enabled, humanize]);

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

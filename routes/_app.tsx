// deno-lint-ignore-file react-no-danger
import { type PageProps } from "$fresh/server.ts";
import { KofiModal } from "../islands/KofiModal.tsx";
import { AboutModal } from "../islands/AboutModal.tsx";
import InstallPrompt from "../islands/InstallPrompt.tsx";
import { StructuredData } from "../components/StructuredData.tsx";

export default function App({ Component }: PageProps) {
  // Pass env vars to client for analytics (only public keys)
  const analyticsEnv = {
    POSTHOG_KEY: Deno.env.get("POSTHOG_KEY"),
    POSTHOG_HOST: Deno.env.get("POSTHOG_HOST"),
  };

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <script
          defer
          src="https://fleetcount.pibulus.deno.net/beacon.js"
          data-site="stargram.pibulus.deno.net"
        >
        </script>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <title>
          Stargram • The Hyperdimensional Horoscope Terminal
        </title>
        <meta
          name="description"
          content="A hyperdimensional terminal that sources fortunes from the cosmos — real sky signals, purple phosphor, a bit haunted, a bit funny."
        />

        {/* Canonical URL */}
        <link rel="canonical" href="https://stargram.app" />

        {/* PWA & iOS App Meta Tags */}
        <meta name="application-name" content="Stargram" />
        <meta name="apple-mobile-web-app-title" content="Stargram" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#a78bfa" />

        {/* Open Graph */}
        <meta property="og:site_name" content="Stargram" />
        <meta
          property="og:title"
          content="Stargram • The Hyperdimensional Horoscope Terminal"
        />
        <meta
          property="og:description"
          content="A hyperdimensional terminal that sources fortunes from the cosmos — real sky signals, purple phosphor, a bit haunted, a bit funny."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stargram.app" />
        <meta
          property="og:image"
          content="https://stargram.app/og-card.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="The Stargram terminal — STARGRAM in glowing purple ASCII above the cosmic access panel"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Stargram • The Hyperdimensional Horoscope Terminal"
        />
        <meta
          name="twitter:description"
          content="A hyperdimensional terminal that sources fortunes from the cosmos — real sky signals, purple phosphor, a bit haunted, a bit funny."
        />
        <meta
          name="twitter:image"
          content="https://stargram.app/og-card.png"
        />
        <meta
          name="twitter:image:alt"
          content="The Stargram terminal — STARGRAM in glowing purple ASCII above the cosmic access panel"
        />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS Icon Support */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />

        {/* Fonts - JetBrains Mono for better terminal experience */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Styles */}
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="/modal-shell.css" />

        {/* Global animation and interaction styles */}
        <style>
          {`
          /* Spring physics for buttons */
          button {
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          /* Better font rendering */
          body, .font-mono {
            font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Courier New', monospace;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }

          /* Scrollbar: thin, ethereal, tinted with whatever accent the
             terminal rolled this session (ZodiacPicker sets the vars). */
          * {
            scrollbar-width: thin;
            scrollbar-color: var(--stargram-accent-soft, rgba(168, 85, 247, 0.3)) transparent;
          }

          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }

          ::-webkit-scrollbar-track {
            background: transparent;
          }

          ::-webkit-scrollbar-thumb {
            background: var(--stargram-accent-soft, rgba(168, 85, 247, 0.3));
            border-radius: 999px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: var(--stargram-accent-hover, rgba(168, 85, 247, 0.6));
          }

          /* Magnetic button hover — pointer devices only, or a tapped
             button keeps the glow until you tap somewhere else. */
          @media (hover: hover) {
            button:hover {
              filter: drop-shadow(0 0 8px var(--color-accent));
            }
          }

          /* Native-app touch manners on controls: no long-press callout,
             no text selection. (Preflight already kills the tap flash.) */
          button, [role="option"] {
            -webkit-touch-callout: none;
            user-select: none;
          }

          /* Respect reduced motion preferences */
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
          `}
        </style>

        {/* Analytics env vars */}
        {/* deno-lint-ignore react-no-danger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(analyticsEnv)};`,
          }}
        />

        {/* Structured Data for SEO */}
        <StructuredData />
      </head>
      <body>
        {/* Skip to content link for keyboard users */}
        <a
          href="#main-content"
          class="sr-only focus:not-sr-only"
          style={{
            position: "fixed",
            top: "1rem",
            left: "1rem",
            zIndex: 99999,
            padding: "0.5rem 1rem",
            backgroundColor: "var(--color-accent)",
            color: "var(--color-text)",
            borderRadius: "0.5rem",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: "bold",
          }}
        >
          Skip to content
        </a>

        {/* Grain layer removed for brighter appearance */}

        {/* Optional: Subtle scanlines on top (much lighter) */}
        <div
          id="scan-layer"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 10000,
            opacity: 0.015,
            background: `repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.1),
              rgba(0, 0, 0, 0.1) 3px,
              transparent 3px,
              transparent 6px
            )`,
          }}
        />
        <Component />

        {/* Ko-fi donation modal */}
        <KofiModal
          kofiUsername="madebypablo"
          title="Support Stargram ☕"
          description="Your support keeps this tool free, ad-free, and open for everyone!"
        />

        {/* About modal */}
        <AboutModal />

        {/* Install prompt */}
        <InstallPrompt />

        {/* Service Worker Registration */}
        {/* deno-lint-ignore react-no-danger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => console.log('🔮 SW registered:', registration.scope))
                    .catch(error => console.log('SW registration failed:', error));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

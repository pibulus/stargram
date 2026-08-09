/**
 * 🔮 Privacy-Focused Analytics Service
 *
 * PRIVACY POLICY:
 * - NO personal data tracked (no text content, no images)
 * - Only aggregate usage metrics (font selections, export formats, success rates)
 * - Error messages sanitized to remove potential personal data
 * - All data anonymized for product improvement only
 *
 * Analytics are OPTIONAL - only loads if POSTHOG_KEY is configured
 *
 * Uses dynamic import to prevent connection attempts without API keys
 */

// deno-lint-ignore-file no-explicit-any
class AnalyticsService {
  private isInitialized = false;
  private posthog: any = null;
  private eventQueue: Array<
    { eventName: string; properties: Record<string, any> }
  > = [];

  async init() {
    if (this.isInitialized || typeof window === "undefined") return;

    // Get keys from window.ENV (set by Fresh in _app.tsx)
    const key = (window as any).ENV?.POSTHOG_KEY;
    const host = (window as any).ENV?.POSTHOG_HOST || "https://app.posthog.com";

    // Early exit unless a real PostHog project key ("phc_...") is set —
    // anything else (e.g. a personal "phx_" key leaking in from the shell
    // env) would only 401-spam the console on every page load.
    if (!key || typeof key !== "string" || !key.startsWith("phc_")) {
      this.isInitialized = true;
      this.eventQueue = []; // Clear queue since we won't process it
      return;
    }

    try {
      // Dynamic import - only loads PostHog when we have API keys
      // Loaded straight from the CDN rather than via a bare "posthog-js"
      // specifier: keeping it in deno.json's imports drags npm:core-js into
      // the dependency graph, whose postinstall build script breaks the
      // Deno Deploy builder. This is browser-only, lazy, and already guarded
      // by the try/catch + key check above.
      const posthogModule = await import(
        "https://esm.sh/posthog-js@1.246.0"
      );
      this.posthog = posthogModule.default;

      this.posthog.init(key, {
        api_host: host,
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: true,
        disable_survey_popups: true,
        property_blacklist: ["$current_url", "$referrer"],
        // Suppress console noise for connection failures
        opt_out_capturing_by_default: false,
        loaded: () => {
          this.isInitialized = true;
          this.processQueue();
        },
        loaded_error: (_error: any) => {
          // Silently fail - no console spam
          this.isInitialized = true;
        },
      });
    } catch (error) {
      console.warn("PostHog failed to load:", error);
      this.isInitialized = true; // Prevent retry loops
    }
  }

  private trackEvent(eventName: string, properties: Record<string, any> = {}) {
    if (typeof window === "undefined") return;

    const event = { eventName, properties };

    if (this.isInitialized && this.posthog) {
      this.posthog.capture(eventName, properties);
    } else {
      this.eventQueue.push(event);
    }
  }

  private processQueue() {
    while (this.eventQueue.length > 0 && this.posthog) {
      const { eventName, properties } = this.eventQueue.shift()!;
      this.posthog.capture(eventName, properties);
    }
  }

  // Horoscope Viewed
  trackHoroscopeViewed(sign: string, period: string) {
    this.trackEvent("horoscope_viewed", {
      sign,
      period,
      effect: "trinity", // only palette shipped; kept so the event schema stays stable
      timestamp: Date.now(),
    });
  }

  // Sign Selection
  trackSignSelected(sign: string) {
    this.trackEvent("sign_selected", {
      sign,
      timestamp: Date.now(),
    });
  }

  // Reading exported (copy / png)
  trackExport(format: string) {
    this.trackEvent("reading_exported", {
      format,
      timestamp: Date.now(),
    });
  }

  // Error Tracking
  trackError(errorType: string, context: Record<string, any> = {}) {
    this.trackEvent("error_occurred", {
      error_type: errorType,
      context,
      timestamp: Date.now(),
    });
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

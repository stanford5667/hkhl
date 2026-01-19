import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight client-side activity signal.
 *
 * We "touch" the current user's `user_usage.updated_at` on:
 * - route changes
 * - a periodic interval while the tab is visible
 *
 * This is used by Admin analytics to compute "Last active" accurately.
 */
export function useActivityHeartbeat(userId: string | null, pathname: string) {
  const lastSentAtRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;
    if (pathname === "/auth" || pathname === "/verify-email") return;

    const MIN_INTERVAL_MS = 60_000; // don't spam updates

    const touch = async () => {
      // Avoid sending too frequently (route changes can be rapid)
      const now = Date.now();
      if (now - lastSentAtRef.current < MIN_INTERVAL_MS) return;
      if (document.visibilityState !== "visible") return;

      lastSentAtRef.current = now;

      const { error } = await supabase
        .from("user_usage")
        .upsert(
          {
            user_id: userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        // Don't block UX; this is best-effort telemetry.
        console.warn("Activity heartbeat failed:", error.message);
      }
    };

    // Initial touch on mount/route change
    void touch();

    // Periodic touch while user is active
    const interval = window.setInterval(() => {
      void touch();
    }, 2 * 60_000);

    return () => window.clearInterval(interval);
  }, [userId, pathname]);
}

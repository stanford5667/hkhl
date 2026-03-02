import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight client-side activity signal.
 *
 * Tracks sessions in `user_sessions` and touches `user_usage.updated_at`.
 * A session is considered "active" if the last heartbeat was within 5 minutes.
 * If longer, a new session is started.
 */
export function useActivityHeartbeat(userId: string | null, pathname: string) {
  const lastSentAtRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (pathname === "/auth" || pathname === "/verify-email") return;

    const MIN_INTERVAL_MS = 60_000;
    const SESSION_GAP_MS = 5 * 60_000; // 5 min gap = new session

    const touch = async () => {
      const now = Date.now();
      if (now - lastSentAtRef.current < MIN_INTERVAL_MS) return;
      if (document.visibilityState !== "visible") return;

      lastSentAtRef.current = now;

      // Touch user_usage (existing behavior)
      supabase
        .from("user_usage")
        .upsert(
          { user_id: userId, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        )
        .then(({ error }) => {
          if (error) console.warn("Activity heartbeat failed:", error.message);
        });

      // Session tracking
      const currentSessionId = sessionIdRef.current;
      if (currentSessionId) {
        // Try to extend existing session
        const { data, error } = await supabase
          .from("user_sessions")
          .update({ last_heartbeat_at: new Date().toISOString() })
          .eq("id", currentSessionId)
          .eq("user_id", userId)
          .gte("last_heartbeat_at", new Date(now - SESSION_GAP_MS).toISOString())
          .select("id")
          .maybeSingle();

        if (!error && data) return; // Session extended successfully
        // Session expired or gone, start new one
      }

      // Start a new session
      const { data: newSession } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          started_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (newSession) {
        sessionIdRef.current = newSession.id;
      }
    };

    // End session on tab hide
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionIdRef.current) {
        supabase
          .from("user_sessions")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", sessionIdRef.current)
          .then(() => {
            sessionIdRef.current = null;
          });
      } else if (document.visibilityState === "visible") {
        // Will create a new session on next touch
        void touch();
      }
    };

    void touch();

    const interval = window.setInterval(() => {
      void touch();
    }, 2 * 60_000);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // End session on unmount
      if (sessionIdRef.current) {
        supabase
          .from("user_sessions")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", sessionIdRef.current);
        sessionIdRef.current = null;
      }
    };
  }, [userId, pathname]);
}

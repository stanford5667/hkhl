import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AFFILIATE_COOKIE_KEY = "al_ref";
const VISITOR_ID_KEY = "al_vid";

function generateVisitorId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getVisitorId(): string {
  let vid = localStorage.getItem(VISITOR_ID_KEY);
  if (!vid) {
    vid = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, vid);
  }
  return vid;
}

export function useAffiliateTracking() {
  const { user } = useAuth();

  useEffect(() => {
    // Check URL for affiliate code (?ref=XXXX)
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    
    if (refCode) {
      // Store in localStorage with timestamp — normalize to uppercase
      const data = { code: refCode.toUpperCase(), timestamp: Date.now(), landing: window.location.pathname };
      localStorage.setItem(AFFILIATE_COOKIE_KEY, JSON.stringify(data));
      
      // Track the click
      const visitorId = getVisitorId();
      supabase.functions.invoke("affiliate-track", {
        body: {
          action: "track_click",
          affiliate_code: refCode.toUpperCase(),
          visitor_id: visitorId,
          landing_page: window.location.href,
          user_agent: navigator.userAgent,
        },
      }).catch(console.error);
      
      // Clean URL without reload
      params.delete("ref");
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Attribute signup when user authenticates
  useEffect(() => {
    if (!user) return;

    const stored = localStorage.getItem(AFFILIATE_COOKIE_KEY);
    if (!stored) return;

    try {
      const { code, timestamp } = JSON.parse(stored);
      // Check 90-day window
      const daysSinceClick = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceClick > 90) {
        localStorage.removeItem(AFFILIATE_COOKIE_KEY);
        return;
      }

      const visitorId = getVisitorId();
      supabase.functions.invoke("affiliate-track", {
        body: {
          action: "attribute_signup",
          visitor_id: visitorId,
          user_id: user.id,
        },
      }).then(() => {
        // Don't remove cookie yet - keep for conversion attribution
      }).catch(console.error);
    } catch {
      localStorage.removeItem(AFFILIATE_COOKIE_KEY);
    }
  }, [user]);
}

/** Get stored affiliate code for checkout attribution */
export function getAffiliateRef(): string | null {
  const stored = localStorage.getItem(AFFILIATE_COOKIE_KEY);
  if (!stored) return null;
  try {
    const { code, timestamp } = JSON.parse(stored);
    const daysSinceClick = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceClick > 90) {
      localStorage.removeItem(AFFILIATE_COOKIE_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

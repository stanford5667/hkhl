import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAffiliateRef } from "@/hooks/useAffiliateTracking";

export type CheckoutPlan = "research_education" | "pro";
export type BillingInterval = "monthly" | "annual";

export interface CheckoutOptions {
  plan?: CheckoutPlan;
  billingInterval?: BillingInterval;
  /** Path the user returns to after Stripe (defaults to the current page) */
  returnPath?: string;
  trial?: boolean;
  /** Free-form label for analytics/debugging: which entry point started checkout */
  source?: string;
}

export type CheckoutResult =
  | "redirecting"
  | "needs_auth"
  | "already_subscribed"
  | "error";

const INTENT_KEY = "alab_checkout_intent";
const INTENT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Persist what the visitor was trying to buy so we can resume checkout after
 * sign-in / sign-up — including flows that leave the SPA entirely
 * (email confirmation, OAuth redirect, hard refresh).
 */
export function saveCheckoutIntent(options: CheckoutOptions) {
  try {
    localStorage.setItem(
      INTENT_KEY,
      JSON.stringify({ ...options, savedAt: Date.now() }),
    );
  } catch {
    /* storage unavailable (private mode) — checkout still works, just no resume */
  }
}

export function clearCheckoutIntent() {
  try {
    localStorage.removeItem(INTENT_KEY);
  } catch {
    /* noop */
  }
}

export function readCheckoutIntent(): CheckoutOptions | null {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutOptions & { savedAt?: number };
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > INTENT_TTL_MS) {
      clearCheckoutIntent();
      return null;
    }
    const { savedAt: _savedAt, ...intent } = parsed;
    return intent;
  } catch {
    return null;
  }
}

/** Guards against double-submits creating two Stripe sessions */
let inFlight = false;

async function readFunctionError(error: unknown): Promise<string | null> {
  const context = (error as { context?: Response })?.context;
  if (!context || typeof context.json !== "function") return null;
  try {
    const body = await context.clone().json();
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

/**
 * Single entry point for every "upgrade" button in the app.
 *
 * - Guests: the intent is stored and `onNeedsAuth` runs (inline sheet or /auth).
 * - Existing subscribers: we send them to the billing portal instead of a dead end.
 * - Everyone else: same-tab redirect to Stripe Checkout (popup blockers can't break it).
 */
export async function launchCheckout(
  options: CheckoutOptions = {},
  handlers: { onNeedsAuth?: (intent: CheckoutOptions) => void } = {},
): Promise<CheckoutResult> {
  if (inFlight) return "redirecting";

  const intent: CheckoutOptions = {
    plan: options.plan ?? "research_education",
    billingInterval: options.billingInterval ?? "annual",
    returnPath:
      options.returnPath ??
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : undefined),
    ...(options.trial ? { trial: true } : {}),
    ...(options.source ? { source: options.source } : {}),
  };

  inFlight = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      saveCheckoutIntent(intent);
      if (handlers.onNeedsAuth) {
        handlers.onNeedsAuth(intent);
      } else if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
      return "needs_auth";
    }

    const affiliateCode = getAffiliateRef();

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        plan: intent.plan,
        billing_interval: intent.billingInterval,
        ...(intent.returnPath && { return_path: intent.returnPath }),
        ...(intent.trial ? { trial: true } : {}),
        ...(affiliateCode && { affiliate_code: affiliateCode }),
      },
    });

    if (error) {
      const message = await readFunctionError(error);
      console.error("Checkout error:", message || error);
      toast.error(message || "We couldn't open checkout. Please try again.", {
        action: {
          label: "Retry",
          onClick: () => {
            void launchCheckout(options, handlers);
          },
        },
      });
      return "error";
    }

    if (data?.already_subscribed) {
      clearCheckoutIntent();
      toast.success("You're already subscribed — opening your billing settings.");
      if (data.url) window.location.href = data.url;
      return "already_subscribed";
    }

    if (data?.url) {
      clearCheckoutIntent();
      window.location.href = data.url;
      return "redirecting";
    }

    toast.error("We couldn't open checkout. Please try again.");
    return "error";
  } catch (err) {
    console.error("Checkout error:", err);
    toast.error("Something went wrong starting checkout. Please try again.");
    return "error";
  } finally {
    // Keep the guard set briefly while the browser navigates away.
    setTimeout(() => {
      inFlight = false;
    }, 1500);
  }
}

/** Continue an interrupted purchase right after the user authenticates. */
export async function resumeCheckoutIntent(): Promise<boolean> {
  const intent = readCheckoutIntent();
  if (!intent) return false;
  clearCheckoutIntent();
  const result = await launchCheckout(intent);
  return result === "redirecting" || result === "already_subscribed";
}

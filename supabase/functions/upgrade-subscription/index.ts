import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// All known product IDs by tier
const PRO_PRODUCT_IDS = [
  "prod_TmstE9xtaH6xoT",   // Pro Plan (monthly)
  "prod_ToF1TRMcLjOt1t",   // Pro Subscription (Test)
  "prod_U76KPGz76OX3rO",   // Pro Plan - Annual
];

const RESEARCH_EDUCATION_PRODUCT_IDS = [
  "prod_U58L8r27VPBg1T",   // Research & Education Plan (monthly)
  "prod_U7X8ELiM8teiz5",   // Research & Education Annual
  "prod_U76PEWCvnIs6Y1",   // Research & Education Plan - Annual (alt)
];

// Target price IDs for each plan + interval
const TARGET_PRICES: Record<string, Record<string, string>> = {
  pro: {
    monthly: "price_1SpJ7t0ATyKK64GzVausjlQ2",      // $50/month
    annual: "price_1T8s7d0ATyKK64Gz9fRwPWNu",        // $492/year
  },
  research_education: {
    monthly: "price_1T9xDL0ATyKK64GzV49xraRC",       // $150/month (new users)
    annual: "price_1T9xDp0ATyKK64Gz5YTQGOQU",        // $1,000/year (new users, ~$83/mo)
  },
};

function getCurrentTier(productId: string): string | null {
  if (PRO_PRODUCT_IDS.includes(productId)) return 'pro';
  if (RESEARCH_EDUCATION_PRODUCT_IDS.includes(productId)) return 'research_education';
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    // Parse request body
    let targetPlan = "research_education";
    let billingInterval = "monthly";
    try {
      const body = await req.json();
      if (body?.billing_interval === "annual" || body?.billing_interval === "monthly") {
        billingInterval = body.billing_interval;
      }
      if (body?.target_plan && TARGET_PRICES[body.target_plan]) {
        targetPlan = body.target_plan;
      }
    } catch { /* defaults */ }

    const newPriceId = TARGET_PRICES[targetPlan][billingInterval];
    logStep("Target upgrade", { targetPlan, billingInterval, newPriceId });

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. You need an active subscription to upgrade.");
    }
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Find any active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    let currentSubscription: Stripe.Subscription | null = null;
    let currentItemId: string | null = null;
    let currentProductId: string | null = null;
    let currentPriceId: string | null = null;

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const productId = typeof item.price.product === "string"
          ? item.price.product
          : (item.price.product as any)?.id;
        
        const tier = getCurrentTier(productId);
        if (tier) {
          currentSubscription = sub;
          currentItemId = item.id;
          currentProductId = productId;
          currentPriceId = item.price.id;
          break;
        }
      }
      if (currentSubscription) break;
    }

    if (!currentSubscription || !currentItemId) {
      throw new Error("No active subscription found to upgrade.");
    }

    // Don't allow "upgrading" to the same price
    if (currentPriceId === newPriceId) {
      throw new Error("You are already on this plan and billing interval.");
    }

    logStep("Found subscription to upgrade", {
      subscriptionId: currentSubscription.id,
      itemId: currentItemId,
      currentProduct: currentProductId,
      currentPrice: currentPriceId,
      targetPrice: newPriceId,
    });

    // Update the subscription with proration — charge the difference immediately
    // and reset the billing cycle so the next invoice is simply the new plan price.
    const updatedSubscription = await stripe.subscriptions.update(currentSubscription.id, {
      items: [
        {
          id: currentItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: "always_invoice",
      billing_cycle_anchor: "now",
    });

    logStep("Subscription upgraded with proration", {
      newSubscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
    });

    // Fetch the upcoming invoice to show the prorated amount
    let proratedAmount: number | null = null;
    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });
      proratedAmount = upcomingInvoice.amount_due;
      logStep("Prorated amount on next invoice", {
        amountDue: proratedAmount,
        currency: upcomingInvoice.currency,
      });
    } catch (e) {
      logStep("Could not fetch upcoming invoice (non-fatal)", { error: e });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Subscription upgraded successfully! You've been prorated for the remaining time on your previous plan.",
      prorated_amount: proratedAmount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

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

// Pro product IDs
const PRO_PRODUCT_IDS = ["prod_TmstE9xtaH6xoT", "prod_ToF1TRMcLjOt1t"];

// Research & Education price IDs
const RESEARCH_PRICES: Record<string, string> = {
  monthly: "price_1T6y590ATyKK64GzTH165hof",   // $100/month
  annual: "price_1T9I460ATyKK64Gz92CYtZUc",     // $700/year
};

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

    let billingInterval = "monthly";
    try {
      const body = await req.json();
      if (body?.billing_interval === "annual" || body?.billing_interval === "monthly") {
        billingInterval = body.billing_interval;
      }
    } catch { /* defaults */ }

    const newPriceId = RESEARCH_PRICES[billingInterval];
    logStep("Target upgrade", { billingInterval, newPriceId });

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

    // Find active Pro subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    let proSubscription: Stripe.Subscription | null = null;
    let proItemId: string | null = null;

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const productId = typeof item.price.product === "string" 
          ? item.price.product 
          : (item.price.product as any)?.id;
        if (PRO_PRODUCT_IDS.includes(productId)) {
          proSubscription = sub;
          proItemId = item.id;
          break;
        }
      }
      if (proSubscription) break;
    }

    if (!proSubscription || !proItemId) {
      throw new Error("No active Pro subscription found to upgrade.");
    }
    logStep("Found Pro subscription to upgrade", { 
      subscriptionId: proSubscription.id, 
      itemId: proItemId 
    });

    // Update the subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(proSubscription.id, {
      items: [
        {
          id: proItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
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
        currency: upcomingInvoice.currency 
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-CONNECT-ONBOARD] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get affiliate record
    const { data: affiliate, error: affError } = await supabaseClient
      .from("affiliates")
      .select("id, stripe_connect_account_id, stripe_connect_onboarded, affiliate_code")
      .eq("user_id", user.id)
      .single();

    if (affError || !affiliate) throw new Error("Affiliate account not found");
    logStep("Affiliate found", { affiliateId: affiliate.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://assetlabs.ai";

    let accountId = affiliate.stripe_connect_account_id;

    // Create a Connect account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        metadata: {
          affiliate_id: affiliate.id,
          affiliate_code: affiliate.affiliate_code,
        },
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      logStep("Created Stripe Connect account", { accountId });

      await supabaseClient
        .from("affiliates")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", affiliate.id);
    }

    // Create an account link for onboarding/dashboard
    const body = await req.json().catch(() => ({}));
    const linkType = body.link_type || "onboarding"; // "onboarding" or "dashboard"

    if (linkType === "dashboard") {
      // Create a login link for already-onboarded accounts
      try {
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        logStep("Created login link", { url: loginLink.url });
        return new Response(JSON.stringify({ url: loginLink.url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (e) {
        logStep("Login link failed, falling back to account link", { error: e });
        // Fall through to create onboarding link instead
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/affiliate?stripe_connect=refresh`,
      return_url: `${origin}/affiliate?stripe_connect=complete`,
      type: "account_onboarding",
    });
    logStep("Created account link", { url: accountLink.url });

    return new Response(JSON.stringify({ url: accountLink.url }), {
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

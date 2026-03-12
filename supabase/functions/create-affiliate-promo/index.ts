import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-AFFILIATE-PROMO] ${step}${detailsStr}`);
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
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");

    const { affiliate_id, affiliate_code } = await req.json();
    if (!affiliate_id || !affiliate_code) throw new Error("Missing affiliate_id or affiliate_code");

    logStep("Creating promo for affiliate", { affiliate_id, affiliate_code });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if affiliate already has a promo code
    const { data: existing } = await supabaseClient
      .from("affiliates")
      .select("stripe_promo_code_id")
      .eq("id", affiliate_id)
      .single();

    if (existing?.stripe_promo_code_id) {
      logStep("Affiliate already has promo code", { promo_id: existing.stripe_promo_code_id });
      return new Response(JSON.stringify({ success: true, already_exists: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create a coupon: 10% off, first month only
    const coupon = await stripe.coupons.create({
      percent_off: 10,
      duration: "once",
      name: `Affiliate Referral - ${affiliate_code}`,
      metadata: {
        affiliate_id,
        affiliate_code,
        type: "affiliate_referral",
      },
    });

    logStep("Coupon created", { coupon_id: coupon.id });

    // Create a promotion code using the affiliate's code
    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: affiliate_code,
      metadata: {
        affiliate_id,
        affiliate_code,
        type: "affiliate_referral",
      },
    });

    logStep("Promotion code created", { promo_id: promoCode.id, code: promoCode.code });

    // Save to database
    await supabaseClient
      .from("affiliates")
      .update({
        stripe_coupon_id: coupon.id,
        stripe_promo_code_id: promoCode.id,
      })
      .eq("id", affiliate_id);

    logStep("Affiliate updated with Stripe promo IDs");

    return new Response(JSON.stringify({ success: true, promo_code: promoCode.code }), {
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

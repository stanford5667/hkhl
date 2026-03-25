import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BACKFILL-AFFILIATE-PROMOS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Admin access required");

    // Find approved affiliates missing Stripe promo codes
    const { data: affiliates } = await supabaseAdmin
      .from("affiliates")
      .select("id, affiliate_code, stripe_promo_code_id, stripe_coupon_id")
      .eq("status", "approved")
      .is("stripe_promo_code_id", null);

    if (!affiliates || affiliates.length === 0) {
      logStep("No affiliates need backfilling");
      return new Response(JSON.stringify({ success: true, backfilled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Affiliates to backfill", { count: affiliates.length });
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const results: { code: string; success: boolean; error?: string }[] = [];

    for (const aff of affiliates) {
      try {
        const coupon = await stripe.coupons.create({
          percent_off: 10,
          duration: "once",
          name: `Affiliate Referral - ${aff.affiliate_code}`,
          metadata: { affiliate_id: aff.id, affiliate_code: aff.affiliate_code, type: "affiliate_referral" },
        });

        const promoCode = await stripe.promotionCodes.create({
          coupon: coupon.id,
          code: aff.affiliate_code,
          metadata: { affiliate_id: aff.id, affiliate_code: aff.affiliate_code, type: "affiliate_referral" },
        });

        await supabaseAdmin
          .from("affiliates")
          .update({ stripe_coupon_id: coupon.id, stripe_promo_code_id: promoCode.id })
          .eq("id", aff.id);

        results.push({ code: aff.affiliate_code, success: true });
        logStep("Backfilled", { code: aff.affiliate_code });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ code: aff.affiliate_code, success: false, error: msg });
        logStep("Failed to backfill", { code: aff.affiliate_code, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, backfilled: results.filter(r => r.success).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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

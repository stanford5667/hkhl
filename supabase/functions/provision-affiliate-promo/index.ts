import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { affiliate_code } = await req.json();
    if (!affiliate_code) throw new Error("affiliate_code required");

    const code = affiliate_code.trim().toUpperCase();

    // Look up affiliate
    const { data: affiliate, error: affErr } = await supabaseAdmin
      .from("affiliates")
      .select("id, affiliate_code, stripe_coupon_id, stripe_promo_code_id, status, discount_percent")
      .eq("affiliate_code", code)
      .eq("status", "approved")
      .maybeSingle();

    if (affErr || !affiliate) throw new Error(`Affiliate not found or not approved: ${code}`);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const discountPercent = affiliate.discount_percent ?? 10;
    const forceRecreate = req.headers.get("x-force-recreate") === "true";

    // If promo already exists and is valid, check if discount matches
    if (affiliate.stripe_promo_code_id) {
      try {
        const existing = await stripe.promotionCodes.retrieve(affiliate.stripe_promo_code_id);
        if (existing.active && !forceRecreate) {
          // Check if the coupon's discount matches
          const coupon = await stripe.coupons.retrieve(existing.coupon as string);
          if (coupon.percent_off === discountPercent) {
            return new Response(JSON.stringify({ success: true, message: "Promo code already exists and is active", promo_id: existing.id, code: existing.code }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        // Deactivate old promo code if it exists
        if (existing.active) {
          await stripe.promotionCodes.update(existing.id, { active: false });
        }
      } catch { /* will recreate */ }
    }

    // Also search for any existing active promo codes with this code name
    try {
      const existingPromos = await stripe.promotionCodes.list({ code: code, limit: 10 });
      for (const p of existingPromos.data) {
        if (p.active) {
          await stripe.promotionCodes.update(p.id, { active: false });
        }
      }
    } catch { /* ignore */ }

    const coupon = await stripe.coupons.create({
      percent_off: discountPercent,
      duration: "once",
      name: `Affiliate Referral - ${code}`,
      metadata: { affiliate_id: affiliate.id, affiliate_code: code, type: "affiliate_referral" },
    });

    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code,
      metadata: { affiliate_id: affiliate.id, affiliate_code: code, type: "affiliate_referral" },
    });

    // Save to DB
    await supabaseAdmin
      .from("affiliates")
      .update({ stripe_coupon_id: coupon.id, stripe_promo_code_id: promoCode.id })
      .eq("id", affiliate.id);

    return new Response(JSON.stringify({ success: true, promo_id: promoCode.id, code: promoCode.code, coupon_id: coupon.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const PLAN_PRICES: Record<string, Record<string, string>> = {
  pro: {
    monthly: "price_1SpJ7t0ATyKK64GzVausjlQ2",
    annual: "price_1T8s7d0ATyKK64Gz9fRwPWNu",
  },
  research_education: {
    monthly: "price_1T9xDL0ATyKK64GzV49xraRC",
    annual: "price_1T9xDp0ATyKK64Gz5YTQGOQU",
  },
};

/** Ensure an affiliate has a valid Stripe promo code, creating one if missing or invalid */
async function ensureAffiliatePromoCode(
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof createClient>,
  affiliateId: string,
  affiliateCode: string,
  existingPromoId: string | null,
  existingCouponId: string | null,
  discountPercent: number = 10
): Promise<string | null> {
  // If we already have a promo code ID, validate it's still active in Stripe
  if (existingPromoId) {
    try {
      const promo = await stripe.promotionCodes.retrieve(existingPromoId);
      if (promo.active) {
        logStep("Existing promo code is valid and active", { promoId: existingPromoId });
        return existingPromoId;
      }
      logStep("Existing promo code is inactive in Stripe, will recreate", { promoId: existingPromoId });
    } catch (err) {
      logStep("Failed to retrieve promo code from Stripe, will recreate", { promoId: existingPromoId, error: String(err) });
    }
  }

  // Create a new coupon + promo code
  try {
    logStep("Auto-creating Stripe promo code for affiliate", { affiliateId, affiliateCode });

    const coupon = await stripe.coupons.create({
      percent_off: discountPercent,
      duration: "once",
      name: `Affiliate Referral - ${affiliateCode}`,
      metadata: { affiliate_id: affiliateId, affiliate_code: affiliateCode, type: "affiliate_referral" },
    });

    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: affiliateCode,
      metadata: { affiliate_id: affiliateId, affiliate_code: affiliateCode, type: "affiliate_referral" },
    });

    logStep("Promo code auto-created", { promoId: promoCode.id, code: promoCode.code });

    // Save back to database
    await supabaseAdmin
      .from("affiliates")
      .update({ stripe_coupon_id: coupon.id, stripe_promo_code_id: promoCode.id })
      .eq("id", affiliateId);

    return promoCode.id;
  } catch (err) {
    logStep("Failed to auto-create promo code", { error: String(err) });
    return null;
  }
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    let selectedPlan = "research_education";
    let billingInterval = "monthly";
    let returnPath = "/quant-lab";
    let affiliateCode: string | null = null;
    let enableTrial = false;
    try {
      const body = await req.json();
      if (body?.plan && PLAN_PRICES[body.plan]) {
        selectedPlan = body.plan;
      }
      if (body?.billing_interval === 'annual' || body?.billing_interval === 'monthly') {
        billingInterval = body.billing_interval;
      }
      if (body?.return_path && typeof body.return_path === 'string') {
        returnPath = body.return_path.startsWith('/') ? body.return_path : '/quant-lab';
      }
      if (body?.affiliate_code && typeof body.affiliate_code === 'string') {
        affiliateCode = body.affiliate_code.trim().toUpperCase();
      }
      if (body?.trial === true) {
        enableTrial = true;
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    const priceId = PLAN_PRICES[selectedPlan][billingInterval];
    logStep("Selected plan", { plan: selectedPlan, billingInterval, priceId, returnPath, affiliateCode, enableTrial });

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 100,
      });
      
      const hasActiveSubscription = subscriptions.data.some(
        (sub: { items: { data: Array<{ price: { id: string } }> } }) => 
          sub.items.data.some((item: { price: { id: string } }) => item.price.id === priceId)
      );
      
      if (hasActiveSubscription) {
        logStep("User already has active subscription to this plan");
        return new Response(
          JSON.stringify({ error: "You already have an active subscription to this plan" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    const productionUrl = "https://assetlabs.ai";
    
    const planDescriptions: Record<string, string> = {
      pro: "Your Pro subscription includes:\n• Unlimited portfolio analysis\n• Advanced risk metrics & correlations\n• AI-powered insights & recommendations\n• Real-time market data\n• Priority support\n\nSubscription auto-renews monthly. Cancel anytime from your account settings.",
      research_education: "Elite education, proprietary trade ideas, and the tools to execute them. Unlock our comprehensive AI and investment video course, join the exclusive community chat for real-time trade setups, and get your all-access pass to our AI-powered backtester and 30+ years of institutional data.\n\nSubscription auto-renews monthly. Cancel anytime from your account settings.",
    };

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${productionUrl}${returnPath}?subscription=success`,
      cancel_url: `${productionUrl}${returnPath}?subscription=cancelled`,
      custom_text: {
        submit: {
          message: enableTrial
            ? `Start your 7-day free trial!\n\n${planDescriptions[selectedPlan]}`
            : planDescriptions[selectedPlan],
        },
      },
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    };

    if (enableTrial) {
      sessionParams.subscription_data = { trial_period_days: 7 };
      logStep("Free trial enabled", { days: 7 });
    }

    // Look up affiliate and ensure valid promo code (affiliate codes only work with annual billing)
    if (affiliateCode && billingInterval === 'annual') {
      try {
        const { data: affiliateData } = await supabaseAdmin
          .from("affiliates")
          .select("id, stripe_promo_code_id, stripe_coupon_id, status, affiliate_code, discount_percent")
          .eq("affiliate_code", affiliateCode)
          .eq("status", "approved")
          .maybeSingle();

        if (affiliateData) {
          // Ensure promo code exists and is valid, auto-create if missing
          const validPromoId = await ensureAffiliatePromoCode(
            stripe,
            supabaseAdmin,
            affiliateData.id,
            affiliateData.affiliate_code,
            affiliateData.stripe_promo_code_id,
            affiliateData.stripe_coupon_id,
            affiliateData.discount_percent ?? 10
          );

          if (validPromoId) {
            sessionParams.discounts = [{ promotion_code: validPromoId }];
            sessionParams.metadata = {
              affiliate_id: affiliateData.id,
              affiliate_code: affiliateCode,
            };
            logStep("Affiliate promo applied", { affiliate_id: affiliateData.id, promo_id: validPromoId });
          } else {
            logStep("Could not create/validate promo code, falling back to manual entry");
            sessionParams.allow_promotion_codes = true;
          }
        } else {
          logStep("Affiliate code not found or not approved", { affiliateCode });
          sessionParams.allow_promotion_codes = true;
        }
      } catch (err) {
        logStep("Error looking up affiliate", { error: String(err) });
        sessionParams.allow_promotion_codes = true;
      }
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    if (customerId) {
      sessionParams.customer_update = { name: "auto" };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, plan: selectedPlan, hasAffiliate: !!affiliateCode });

    return new Response(JSON.stringify({ url: session.url }), {
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

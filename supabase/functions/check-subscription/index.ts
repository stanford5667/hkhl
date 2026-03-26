import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// All product IDs for each tier (monthly + annual variants)
const PRO_PRODUCT_IDS = [
  "prod_TmstE9xtaH6xoT",   // Pro Plan (monthly)
  "prod_ToF1TRMcLjOt1t",   // Pro Subscription (Test)
  "prod_U76KPGz76OX3rO",   // Pro Plan - Annual
];

const RESEARCH_EDUCATION_PRODUCT_IDS = [
  "prod_U58L8r27VPBg1T",   // Research & Education Plan (monthly, legacy $100)
  "prod_U7X8ELiM8teiz5",   // Research & Education Annual (legacy $700)
  "prod_U76PEWCvnIs6Y1",   // Research & Education Plan - Annual (alt)
  "prod_U8DecDg6PAn1rs",   // Research & Education Plan (monthly, new $150)
  "prod_U8DfxoZZ3zohLN",   // Research & Education Annual (new $1,000)
];

function determinePlan(productId: string | null): string {
  if (productId && RESEARCH_EDUCATION_PRODUCT_IDS.includes(productId)) return 'research_education';
  if (productId && PRO_PRODUCT_IDS.includes(productId)) return 'pro';
  return 'free';
}

const FREE_RESPONSE = { subscribed: false, plan: 'free', product_id: null, subscription_end: null };

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
    if (!authHeader) {
      logStep("No authorization header - returning free tier");
      return new Response(JSON.stringify(FREE_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      logStep("Auth error or no user - returning free tier", { error: userError?.message });
      return new Response(JSON.stringify(FREE_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // First check database for manual/lifetime subscriptions
    const { data: dbSubscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (dbSubscription && new Date(dbSubscription.current_period_end) > new Date()) {
      logStep("Found active DB subscription (manual/lifetime)", {
        plan: dbSubscription.plan,
        endDate: dbSubscription.current_period_end,
      });
      return new Response(JSON.stringify({
        subscribed: true,
        plan: dbSubscription.plan || 'pro',
        product_id: null,
        subscription_end: dbSubscription.current_period_end,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fall back to Stripe check
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify(FREE_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Filter for active OR trialing subscriptions (past_due means payment failed — no access)
    const activeSubscriptions = subscriptions.data.filter(
      s => s.status === 'active' || s.status === 'trialing'
    );

    // Check if there's a past_due subscription (payment retries in progress)
    const pastDueSubscriptions = subscriptions.data.filter(s => s.status === 'past_due');
    if (pastDueSubscriptions.length > 0 && activeSubscriptions.length === 0) {
      logStep("Subscription is past_due — access revoked until payment succeeds");
      
      // Update DB to reflect past_due status
      const pastDueSub = pastDueSubscriptions[0];
      await supabaseClient.from('subscriptions').delete().eq('user_id', user.id);
      await supabaseClient.from('subscriptions').insert({
        user_id: user.id,
        stripe_subscription_id: pastDueSub.id,
        stripe_customer_id: customerId,
        plan: determinePlan(pastDueSub.items.data[0]?.price?.product as string),
        status: 'past_due',
        current_period_end: new Date(pastDueSub.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: 'free', 
        product_id: null, 
        subscription_end: null,
        payment_past_due: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (activeSubscriptions.length === 0) {
      logStep("No active subscription found");
      return new Response(JSON.stringify(FREE_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find the highest tier subscription
    let bestPlan = 'free';
    let bestSubscription = activeSubscriptions[0];
    let productId: string | null = null;

    for (const subscription of activeSubscriptions) {
      const subProductId = subscription.items.data[0]?.price?.product as string;
      const subPlan = determinePlan(subProductId);

      const tierRank: Record<string, number> = { free: 0, pro: 1, research_education: 2 };
      if (tierRank[subPlan] > tierRank[bestPlan]) {
        bestPlan = subPlan;
        bestSubscription = subscription;
        productId = subProductId;
      }
    }

    let subscriptionEnd: string | null = null;
    const periodEnd = bestSubscription.current_period_end;
    if (periodEnd && typeof periodEnd === 'number') {
      subscriptionEnd = new Date(periodEnd * 1000).toISOString();
    }

    logStep("Active subscription found", { subscriptionId: bestSubscription.id, plan: bestPlan, endDate: subscriptionEnd });

    // Upsert subscription record in database
    await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        stripe_subscription_id: bestSubscription.id,
        stripe_customer_id: customerId,
        plan: bestPlan,
        status: 'active',
        current_period_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (bestPlan === 'research_education' || bestPlan === 'pro') {
      try {
        const { data: courses } = await supabaseClient
          .from('courses')
          .select('id')
          .eq('is_published', true);

        if (courses && courses.length > 0) {
          for (const course of courses) {
            await supabaseClient
              .from('course_enrollments')
              .upsert({
                user_id: user.id,
                course_id: course.id,
              }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });
          }
          logStep("Auto-enrolled user in courses", { courseCount: courses.length });
        }
      } catch (enrollError) {
        logStep("Error auto-enrolling in courses (non-fatal)", { error: enrollError });
      }
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan: bestPlan,
      product_id: productId,
      subscription_end: subscriptionEnd,
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

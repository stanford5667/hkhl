import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product IDs for subscription tiers
const PRO_PRODUCT_IDS = ["prod_TmstE9xtaH6xoT", "prod_ToF1TRMcLjOt1t"];
const RESEARCH_EDUCATION_PRODUCT_IDS = ["prod_U58L8r27VPBg1T"];

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

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
        endDate: dbSubscription.current_period_end 
      });
      return new Response(JSON.stringify({
        subscribed: true,
        plan: dbSubscription.plan || 'pro',
        product_id: null,
        subscription_end: dbSubscription.current_period_end
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fall back to Stripe check
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
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      return new Response(JSON.stringify(FREE_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find the highest tier subscription
    let bestPlan = 'free';
    let bestSubscription = subscriptions.data[0];
    let productId: string | null = null;

    for (const subscription of subscriptions.data) {
      const subProductId = subscription.items.data[0]?.price?.product as string;
      const subPlan = determinePlan(subProductId);
      
      // research_education > pro > free
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

    // Auto-enroll in courses for research_education tier
    if (bestPlan === 'research_education') {
      try {
        // Get all published courses
        const { data: courses } = await supabaseClient
          .from('courses')
          .select('id')
          .eq('is_published', true);

        if (courses && courses.length > 0) {
          // Enroll user in all courses (ignore duplicates)
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
      subscription_end: subscriptionEnd
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Plan price IDs keyed by plan + billing interval
const PLAN_PRICES: Record<string, Record<string, string>> = {
  pro: {
    monthly: "price_1SpJ7t0ATyKK64GzVausjlQ2",      // $50/month
    annual: "price_1T8s7d0ATyKK64Gz9fRwPWNu",        // $492/year ($41/mo)
  },
  research_education: {
    monthly: "price_1T6y590ATyKK64GzTH165hof",       // $100/month
    annual: "price_1T9I460ATyKK64Gz92CYtZUc",        // $700/year (~$58.33/mo)
  },
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

    // Parse request body for plan selection and return path
    let selectedPlan = "pro";
    let billingInterval = "monthly";
    let returnPath = "/quant-lab";
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
    } catch {
      // No body or invalid JSON - use defaults
    }

    const priceId = PLAN_PRICES[selectedPlan][billingInterval];
    logStep("Selected plan", { plan: selectedPlan, billingInterval, priceId, returnPath });

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      // Check if customer already has an active subscription to this plan
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
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }

    // Always use production URL for Stripe redirects (preview URLs won't work)
    const productionUrl = "https://hkhl.lovable.app";
    
    const planNames: Record<string, string> = {
      pro: "Pro",
      research_education: "Research & Education",
    };

    const planDescriptions: Record<string, string> = {
      pro: "Your Pro subscription includes:\n• Unlimited portfolio analysis\n• Advanced risk metrics & correlations\n• AI-powered insights & recommendations\n• Real-time market data\n• Priority support\n\nSubscription auto-renews monthly. Cancel anytime from your account settings.",
      research_education: "Elite education, proprietary trade ideas, and the tools to execute them. Unlock our comprehensive AI and investment video course, join the exclusive community chat for real-time trade setups, and get your all-access pass to our AI-powered backtester and 30+ years of institutional data.\n\nSubscription auto-renews monthly. Cancel anytime from your account settings.",
    };

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${productionUrl}${returnPath}?subscription=success`,
      cancel_url: `${productionUrl}${returnPath}?subscription=cancelled`,
      custom_text: {
        submit: {
          message: planDescriptions[selectedPlan],
        },
      },
      billing_address_collection: "required",
      tax_id_collection: {
        enabled: true,
      },
    };

    // When reusing an existing customer, allow Stripe to update their name for tax ID collection
    if (customerId) {
      sessionParams.customer_update = {
        name: "auto",
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, plan: selectedPlan });

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

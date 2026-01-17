import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Pro Plan price ID ($1 test price)
const PRO_PRICE_ID = "price_1SqcXe0ATyKK64GzNAZriP2L";

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
      
      // Check if customer already has an active subscription to the Pro plan
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 100,
      });
      
      const hasActiveProSubscription = subscriptions.data.some(
        (sub: { items: { data: Array<{ price: { id: string } }> } }) => 
          sub.items.data.some((item: { price: { id: string } }) => item.price.id === PRO_PRICE_ID)
      );
      
      if (hasActiveProSubscription) {
        logStep("User already has active Pro subscription");
        return new Response(
          JSON.stringify({ error: "You already have an active Pro subscription" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }

    // Always use production URL for Stripe redirects (preview URLs won't work)
    const productionUrl = "https://hkhl.lovable.app";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${productionUrl}/quant-lab?subscription=success`,
      cancel_url: `${productionUrl}/quant-lab?subscription=cancelled`,
      // Note: For subscription mode, invoices are created automatically by Stripe
      // Add custom fields to show what's included
      custom_text: {
        submit: {
          message: "Your Pro subscription includes:\n• Unlimited portfolio analysis\n• Advanced risk metrics & correlations\n• AI-powered insights & recommendations\n• Real-time market data\n• Priority support\n\nSubscription auto-renews monthly. Cancel anytime from your account settings.",
        },
      },
      // Collect billing address for invoices
      billing_address_collection: "required",
      // Enable tax ID collection for businesses
      tax_id_collection: {
        enabled: true,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

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

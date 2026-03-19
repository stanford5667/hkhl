import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";

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
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let customerEmail: string | undefined;
    try {
      const body = await req.json();
      if (body?.email) customerEmail = body.email;
    } catch {
      // no body
    }

    const productionUrl = "https://assetlabs.ai";

    const session = await stripe.checkout.sessions.create({
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: [
        {
          price: "price_1TCkaZ0ATyKK64GzNI5R5Mud",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${productionUrl}/management-fee?status=success`,
      cancel_url: `${productionUrl}/management-fee?status=cancelled`,
      billing_address_collection: "required",
      custom_text: {
        submit: {
          message: "Management Fees — $10,000 one-time payment.",
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

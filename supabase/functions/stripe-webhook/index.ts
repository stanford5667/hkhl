import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const loopsApiKey = Deno.env.get("LOOPS_API_KEY");

    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response("Invalid signature", { status: 400 });
    }

    logStep("Event received", { type: event.type });

    // Handle checkout session completed (successful payment)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerName = session.customer_details?.name || "Valued Customer";

      logStep("Checkout completed", { email: customerEmail, sessionId: session.id });

      if (customerEmail && loopsApiKey) {
        // Send payment confirmation email via Loops
        const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loopsApiKey}`,
          },
          body: JSON.stringify({
            email: customerEmail,
            transactionalId: 'cmkiktuob007b0i2fu76g2z82',
            dataVariables: {
              customer_name: customerName,
              plan_name: (session.amount_total === 15000 || session.amount_total === 10000 || session.amount_total === 100000 || session.amount_total === 70000) ? 'Research & Education Plan' : 'Pro Plan',
              amount: session.amount_total === 15000 ? '$150/month' : session.amount_total === 100000 ? '$1,000/year' : session.amount_total === 10000 ? '$100/month' : session.amount_total === 70000 ? '$700/year' : '$50/month',
              app_name: 'Asset Labs',
            },
          }),
        });

        const loopsData = await loopsResponse.json();
        
        if (loopsResponse.ok && loopsData.success) {
          logStep("Payment confirmation email sent", { email: customerEmail });
        } else {
          logStep("Failed to send email", { error: loopsData });
        }
      }
    }

    // Handle subscription events
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription event", { subscriptionId: subscription.id, status: subscription.status });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

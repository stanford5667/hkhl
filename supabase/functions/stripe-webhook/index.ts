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

      // Attribute conversion to affiliate
      if (customerEmail && session.amount_total) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
          const supabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

          // Method 1: Check session metadata for affiliate info (set by create-checkout)
          const sessionMetadata = session.metadata || {};
          let affiliateId = sessionMetadata.affiliate_id;
          let affiliateCode = sessionMetadata.affiliate_code;

          // Method 2: Check the promotion code used at checkout for affiliate metadata
          if (!affiliateId && session.total_details?.breakdown?.discounts) {
            for (const discount of session.total_details.breakdown.discounts) {
              const discountObj = discount.discount;
              if (discountObj?.promotion_code) {
                // Fetch the promotion code to get metadata
                const promoCode = await stripe.promotionCodes.retrieve(discountObj.promotion_code as string);
                if (promoCode.metadata?.affiliate_id) {
                  affiliateId = promoCode.metadata.affiliate_id;
                  affiliateCode = promoCode.metadata.affiliate_code;
                  logStep("Affiliate found via promotion code", { affiliateId, affiliateCode });
                  break;
                }
              }
            }
          }

          // Method 3: Check the coupon metadata
          if (!affiliateId && session.total_details?.breakdown?.discounts) {
            for (const discount of session.total_details.breakdown.discounts) {
              const discountObj = discount.discount;
              if (discountObj?.coupon?.metadata?.affiliate_id) {
                affiliateId = discountObj.coupon.metadata.affiliate_id;
                affiliateCode = discountObj.coupon.metadata.affiliate_code;
                logStep("Affiliate found via coupon metadata", { affiliateId, affiliateCode });
                break;
              }
            }
          }

          // Track whether attribution already happened
          let attributed = false;

          // Method 4: Fallback to cookie-based referral lookup
          if (!affiliateId) {
            // Use getUsersByEmail for reliable lookup (listUsers has 1000 user limit)
            const { data: userList } = await supabaseClient.auth.admin.listUsers({ 
              page: 1, perPage: 1 
            });
            
            // Search for user by email using a more targeted approach
            const { data: profileData } = await supabaseClient
              .from("profiles")
              .select("user_id")
              .eq("email", customerEmail)
              .maybeSingle();

            // Also try direct auth lookup
            let matchedUserId: string | null = profileData?.user_id || null;
            
            if (!matchedUserId) {
              // Fallback: search subscriptions table for the customer email
              const { data: subData } = await supabaseClient
                .from("subscriptions")
                .select("user_id")
                .eq("stripe_customer_id", session.customer as string)
                .maybeSingle();
              
              matchedUserId = subData?.user_id || null;
            }
            
            if (matchedUserId) {
              const { data: referral } = await supabaseClient
                .from("affiliate_referrals")
                .select("id, affiliate_id, affiliates!inner(commission_rate)")
                .eq("referred_user_id", matchedUserId)
                .is("converted_at", null)
                .order("click_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (referral) {
                affiliateId = referral.affiliate_id;
                logStep("Affiliate found via cookie-based referral", { affiliateId, userId: matchedUserId });
                
                const amountDollars = session.amount_total / 100;
                const affiliate = (referral as any).affiliates;
                const commission = (amountDollars * affiliate.commission_rate) / 100;

                await supabaseClient.from("affiliate_referrals").update({
                  converted_at: new Date().toISOString(),
                  conversion_amount: amountDollars,
                  commission_amount: commission,
                  commission_status: "approved",
                  stripe_subscription_id: session.subscription as string,
                }).eq("id", referral.id);

                await supabaseClient.rpc("update_affiliate_earnings", {
                  aff_id: referral.affiliate_id,
                  earning_amount: commission,
                });

                attributed = true;
                logStep("Affiliate commission attributed (cookie method)", { 
                  affiliate_id: referral.affiliate_id, 
                  amount: amountDollars, 
                  commission 
                });
              } else {
                logStep("No unconverted referral found for user", { userId: matchedUserId });
              }
            } else {
              logStep("Could not find user for affiliate attribution", { customerEmail });
            }
          }

          // If we found affiliate via promo code/metadata (and not already attributed via cookie), attribute the commission
          if (affiliateId && !attributed) {
            const { data: affiliateData } = await supabaseClient
              .from("affiliates")
              .select("id, commission_rate")
              .eq("id", affiliateId)
              .single();

            if (affiliateData) {
              const amountDollars = session.amount_total / 100;
              const commission = (amountDollars * affiliateData.commission_rate) / 100;

              // Find user by subscription's customer or profile email
              let matchedUserId: string | null = null;
              
              // Try subscriptions table first (most reliable since we just created it)
              const { data: subData } = await supabaseClient
                .from("subscriptions")
                .select("user_id")
                .eq("stripe_customer_id", session.customer as string)
                .maybeSingle();
              
              matchedUserId = subData?.user_id || null;

              if (!matchedUserId) {
                // Fallback: search profiles by email
                const { data: profileData } = await supabaseClient
                  .from("profiles")
                  .select("user_id")
                  .eq("email", customerEmail)
                  .maybeSingle();
                matchedUserId = profileData?.user_id || null;
              }

              // Create or update referral record
              if (matchedUserId) {
                const matchedUser = { id: matchedUserId };
                // Check if a referral already exists for this user
                const { data: existingRef } = await supabaseClient
                  .from("affiliate_referrals")
                  .select("id")
                  .eq("affiliate_id", affiliateId)
                  .eq("referred_user_id", matchedUser.id)
                  .maybeSingle();

                if (existingRef) {
                  await supabaseClient.from("affiliate_referrals").update({
                    converted_at: new Date().toISOString(),
                    conversion_amount: amountDollars,
                    commission_amount: commission,
                    commission_status: "approved",
                    stripe_subscription_id: session.subscription as string,
                  }).eq("id", existingRef.id);
                } else {
                  await supabaseClient.from("affiliate_referrals").insert({
                    affiliate_id: affiliateId,
                    referred_user_id: matchedUser.id,
                    signed_up_at: new Date().toISOString(),
                    converted_at: new Date().toISOString(),
                    conversion_amount: amountDollars,
                    commission_amount: commission,
                    commission_status: "approved",
                    stripe_subscription_id: session.subscription as string,
                  });
                }

                await supabaseClient.rpc("update_affiliate_earnings", {
                  aff_id: affiliateId,
                  earning_amount: commission,
                });

                // Increment referral count
                await supabaseClient.rpc("increment_affiliate_referrals", { aff_id: affiliateId });

                logStep("Affiliate commission attributed (promo code method)", { 
                  affiliate_id: affiliateId, 
                  amount: amountDollars, 
                  commission 
                });
              }
            }
          }
        } catch (affErr) {
          logStep("Affiliate attribution error (non-fatal)", { error: String(affErr) });
        }
      }
    }

    // Handle subscription cancellation - churn re-engagement
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription cancelled", { subscriptionId: subscription.id });

      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (customer.email) {
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const matchedUser = userData?.users?.find(u => u.email === customer.email);

          if (matchedUser) {
            // Insert churn re-engagement notification
            await supabaseClient.from("user_notifications").insert({
              user_id: matchedUser.id,
              type: "churn",
              title: "We miss you! 💔",
              message: "Your subscription has ended. Come back and continue your investment education journey — we've been adding new features and content!",
              metadata: { subscription_id: subscription.id },
            });
            logStep("Churn notification sent", { userId: matchedUser.id });

            // Send churn email via Loops if configured
            if (loopsApiKey) {
              await fetch('https://app.loops.so/api/v1/transactional', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${loopsApiKey}` },
                body: JSON.stringify({
                  email: customer.email,
                  transactionalId: 'cmkiktuob007b0i2fu76g2z82',
                  dataVariables: {
                    customer_name: customer.name || 'there',
                    plan_name: 'Your Subscription',
                    amount: 'cancelled',
                    app_name: 'Asset Labs',
                  },
                }),
              });
              logStep("Churn email sent via Loops", { email: customer.email });
            }
          }
        }
      } catch (churnErr) {
        logStep("Churn re-engagement error (non-fatal)", { error: String(churnErr) });
      }
    }

    // Handle subscription status changes (active, past_due, unpaid, canceled, etc.)
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Subscription event", { subscriptionId: subscription.id, status: subscription.status });

      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

        if (customer.email) {
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const matchedUser = userData?.users?.find(u => u.email === customer.email);

          if (matchedUser) {
            // Map Stripe status to our subscription status
            const statusMap: Record<string, string> = {
              active: 'active',
              trialing: 'active',
              past_due: 'past_due',
              unpaid: 'unpaid',
              canceled: 'canceled',
              incomplete: 'incomplete',
              incomplete_expired: 'canceled',
              paused: 'paused',
            };
            const dbStatus = statusMap[subscription.status] || subscription.status;

            const periodEnd = subscription.current_period_end;
            const subscriptionEnd = periodEnd && typeof periodEnd === 'number'
              ? new Date(periodEnd * 1000).toISOString()
              : null;

            // Determine the plan from the product
            const productId = subscription.items.data[0]?.price?.product as string;
            const PRO_PRODUCT_IDS = [
              "prod_TmstE9xtaH6xoT", "prod_ToF1TRMcLjOt1t", "prod_U76KPGz76OX3rO",
            ];
            const RESEARCH_EDUCATION_PRODUCT_IDS = [
              "prod_U58L8r27VPBg1T", "prod_U7X8ELiM8teiz5", "prod_U76PEWCvnIs6Y1",
              "prod_U8DecDg6PAn1rs", "prod_U8DfxoZZ3zohLN",
            ];
            let plan = 'pro';
            if (RESEARCH_EDUCATION_PRODUCT_IDS.includes(productId)) plan = 'research_education';
            else if (PRO_PRODUCT_IDS.includes(productId)) plan = 'pro';

            // Delete then insert to avoid unique constraint issues
            await supabaseClient.from('subscriptions').delete().eq('user_id', matchedUser.id);
            await supabaseClient.from('subscriptions').insert({
              user_id: matchedUser.id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              plan: plan,
              status: dbStatus,
              current_period_end: subscriptionEnd,
              cancel_at_period_end: subscription.cancel_at_period_end || false,
              updated_at: new Date().toISOString(),
            });

            logStep("Subscription synced to DB", { userId: matchedUser.id, status: dbStatus, plan });

            // If past_due or unpaid, downgrade profile membership tier
            if (dbStatus === 'past_due' || dbStatus === 'unpaid' || dbStatus === 'canceled') {
              await supabaseClient.from('profiles').update({
                membership_tier: 'free',
              }).eq('user_id', matchedUser.id);
              logStep("User downgraded due to payment failure", { userId: matchedUser.id, status: dbStatus });
            } else if (dbStatus === 'active') {
              await supabaseClient.from('profiles').update({
                membership_tier: 'pro',
              }).eq('user_id', matchedUser.id);
            }
          }
        }
      } catch (subErr) {
        logStep("Subscription sync error (non-fatal)", { error: String(subErr) });
      }
    }

    // Handle failed invoice payments — notify user
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const attemptCount = invoice.attempt_count;
      logStep("Payment failed", { invoiceId: invoice.id, attemptCount, customerId: invoice.customer });

      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

        if (customer.email) {
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const matchedUser = userData?.users?.find(u => u.email === customer.email);

          if (matchedUser) {
            const isFirstAttempt = attemptCount <= 1;
            await supabaseClient.from("user_notifications").insert({
              user_id: matchedUser.id,
              type: "payment_failed",
              title: isFirstAttempt ? "Payment failed ⚠️" : `Payment retry #${attemptCount} failed ⚠️`,
              message: isFirstAttempt
                ? "We couldn't process your subscription payment. Please update your payment method to avoid losing access to premium features."
                : `We've tried ${attemptCount} times to process your payment. Please update your billing info soon to keep your subscription active.`,
              metadata: { invoice_id: invoice.id, attempt_count: attemptCount },
            });
            logStep("Payment failure notification sent", { userId: matchedUser.id, attempt: attemptCount });
          }
        }
      } catch (notifErr) {
        logStep("Payment failure notification error (non-fatal)", { error: String(notifErr) });
      }
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

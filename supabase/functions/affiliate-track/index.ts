import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AFFILIATE-TRACK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { action, ...params } = await req.json();
    logStep("Action received", { action });

    // Track a click on an affiliate link
    if (action === "track_click") {
      const { affiliate_code, visitor_id, landing_page, user_agent } = params;
      
      // Find the affiliate
      const { data: affiliate, error: affError } = await supabase
        .from("affiliates")
        .select("id, status")
        .eq("affiliate_code", affiliate_code)
        .single();

      if (affError || !affiliate || affiliate.status !== "approved") {
        logStep("Invalid or inactive affiliate code", { affiliate_code });
        return new Response(JSON.stringify({ success: false, error: "Invalid affiliate code" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Record the click
      await supabase.from("affiliate_referrals").insert({
        affiliate_id: affiliate.id,
        visitor_id,
        landing_page,
        user_agent,
      });

      // Increment click count
      await supabase.rpc("increment_affiliate_clicks", { aff_id: affiliate.id });

      logStep("Click tracked", { affiliate_code, visitor_id });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Attribute a signup to an affiliate
    if (action === "attribute_signup") {
      const { visitor_id, user_id } = params;

      // Find the most recent click from this visitor within attribution window
      const { data: referral } = await supabase
        .from("affiliate_referrals")
        .select("id, affiliate_id, affiliates!inner(attribution_days, status)")
        .eq("visitor_id", visitor_id)
        .is("referred_user_id", null)
        .order("click_at", { ascending: false })
        .limit(1)
        .single();

      if (!referral) {
        return new Response(JSON.stringify({ success: false, error: "No referral found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check attribution window
      const affiliate = (referral as any).affiliates;
      if (affiliate.status !== "approved") {
        return new Response(JSON.stringify({ success: false, error: "Affiliate not active" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Update referral with user info
      await supabase
        .from("affiliate_referrals")
        .update({ referred_user_id: user_id, signed_up_at: new Date().toISOString() })
        .eq("id", referral.id);

      // Increment referral count
      const { error: incError } = await supabase.rpc("increment_affiliate_referrals", { aff_id: referral.affiliate_id });
      if (incError) logStep("Error incrementing referrals", incError);

      logStep("Signup attributed", { visitor_id, user_id, affiliate_id: referral.affiliate_id });
      return new Response(JSON.stringify({ success: true, affiliate_id: referral.affiliate_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Attribute a conversion (payment) to an affiliate
    if (action === "attribute_conversion") {
      const { user_id, amount, stripe_subscription_id } = params;

      // Find referral for this user
      const { data: referral } = await supabase
        .from("affiliate_referrals")
        .select("id, affiliate_id, affiliates!inner(commission_rate, commission_type)")
        .eq("referred_user_id", user_id)
        .order("click_at", { ascending: false })
        .limit(1)
        .single();

      if (!referral) {
        logStep("No referral found for converting user", { user_id });
        return new Response(JSON.stringify({ success: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const affiliate = (referral as any).affiliates;
      const commissionAmount = (amount * affiliate.commission_rate) / 100;

      // Update referral with conversion data
      await supabase
        .from("affiliate_referrals")
        .update({
          converted_at: new Date().toISOString(),
          conversion_amount: amount,
          commission_amount: commissionAmount,
          commission_status: "approved",
          stripe_subscription_id,
        })
        .eq("id", referral.id);

      // Update affiliate totals
      await supabase.rpc("update_affiliate_earnings", {
        aff_id: referral.affiliate_id,
        earning_amount: commissionAmount,
      });

      logStep("Conversion attributed", { user_id, amount, commission: commissionAmount });
      return new Response(JSON.stringify({ success: true, commission: commissionAmount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get affiliate stats (for authenticated affiliate)
    if (action === "get_stats") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Not authenticated");
      
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      if (!userData.user) throw new Error("Invalid token");

      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", userData.user.id)
        .single();

      if (!affiliate) {
        return new Response(JSON.stringify({ success: false, error: "Not an affiliate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Get recent referrals
      const { data: referrals } = await supabase
        .from("affiliate_referrals")
        .select("id, click_at, signed_up_at, converted_at, conversion_amount, commission_amount, commission_status")
        .eq("affiliate_id", affiliate.id)
        .order("click_at", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ success: true, affiliate, referrals }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
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

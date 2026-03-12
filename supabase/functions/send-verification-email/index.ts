import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-VERIFICATION-EMAIL] ${step}${detailsStr}`);
};

interface VerificationRequest {
  userId: string;
  email: string;
  fullName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const loopsApiKey = Deno.env.get("LOOPS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!loopsApiKey) {
      throw new Error("LOOPS_API_KEY not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, fullName }: VerificationRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: "userId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing verification request", { userId, email });

    // Generate a verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store the verification token
    const { error: insertError } = await supabase
      .from('email_verifications')
      .insert({
        user_id: userId,
        email: email,
        token: verificationToken,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      logStep("Failed to store verification token", { error: insertError });
      throw new Error("Failed to create verification record");
    }

    // Build verification URL
    const verificationUrl = `https://assetlabs.ai/verify-email?token=${verificationToken}`;

    logStep("Sending verification email via Loops", { email, verificationUrl });

    // Send email via Loops
    const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loopsApiKey}`,
      },
      body: JSON.stringify({
        email: email,
        transactionalId: 'cmkilpajg2f2h0i3tsi1d2ybu',
        dataVariables: {
          customer_name: fullName || email.split('@')[0],
          confirmation_link: verificationUrl,
        },
      }),
    });

    const loopsData = await loopsResponse.json();

    if (!loopsResponse.ok) {
      logStep("Loops API error", { status: loopsResponse.status, data: loopsData });
      throw new Error(`Loops API error: ${JSON.stringify(loopsData)}`);
    }

    logStep("Verification email sent successfully", { email });

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

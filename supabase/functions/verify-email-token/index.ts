import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-EMAIL-TOKEN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Verifying token", { token: token.substring(0, 8) + "..." });

    // Find the verification record
    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('token', token)
      .eq('verified', false)
      .single();

    if (fetchError || !verification) {
      logStep("Token not found or already verified", { error: fetchError });
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification link" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired
    if (new Date(verification.expires_at) < new Date()) {
      logStep("Token expired", { expiresAt: verification.expires_at });
      return new Response(
        JSON.stringify({ error: "Verification link has expired. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Token valid, updating user", { userId: verification.user_id });

    // Update auth.users to confirm the email using admin API
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(
      verification.user_id,
      { email_confirm: true }
    );

    if (updateUserError) {
      logStep("Failed to confirm user email", { error: updateUserError });
      throw new Error("Failed to verify email");
    }

    // Mark verification as used
    const { error: updateVerificationError } = await supabase
      .from('email_verifications')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', verification.id);

    if (updateVerificationError) {
      logStep("Failed to update verification record", { error: updateVerificationError });
      // Don't throw - the email is already confirmed
    }

    logStep("Email verified successfully", { userId: verification.user_id });

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
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

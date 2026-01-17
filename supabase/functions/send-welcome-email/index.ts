import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

interface WelcomeEmailRequest {
  email: string;
  fullName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const loopsApiKey = Deno.env.get("LOOPS_API_KEY");

    if (!loopsApiKey) {
      logStep("ERROR: LOOPS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Sending welcome email", { email, fullName });

    // Send welcome email via Loops
    // You'll need to create a transactional email template in Loops and use its ID here
    const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loopsApiKey}`,
      },
      body: JSON.stringify({
        email: email,
        transactionalId: 'YOUR_WELCOME_EMAIL_TEMPLATE_ID', // Replace with your Loops template ID
        dataVariables: {
          customer_name: fullName || email.split('@')[0],
          login_url: 'https://aiassetlabs.com/auth',
        },
      }),
    });

    const loopsData = await loopsResponse.json();

    if (!loopsResponse.ok) {
      logStep("Loops API error", { status: loopsResponse.status, data: loopsData });
      // Don't throw - welcome emails shouldn't block signup
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send welcome email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Welcome email sent successfully", { email });

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    // Return success anyway - don't block signup for email failures
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

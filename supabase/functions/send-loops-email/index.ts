import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthenticatedUser, createUserClient, unauthorizedResponse } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoopsEmailRequest {
  email: string;
  transactionalId: string;
  dataVariables?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOOPS_API_KEY = Deno.env.get('LOOPS_API_KEY');
    
    if (!LOOPS_API_KEY) {
      console.error('LOOPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Loops API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, transactionalId, dataVariables } = await req.json() as LoopsEmailRequest;

    if (!email || !transactionalId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and transactionalId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending Loops transactional email to ${email} with template ${transactionalId}`);

    const loopsResponse = await fetch('https://app.loops.so/api/v1/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOOPS_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        transactionalId,
        dataVariables: dataVariables || {},
      }),
    });

    const loopsData = await loopsResponse.json();

    if (!loopsResponse.ok || !loopsData.success) {
      console.error('Loops API error:', loopsData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: loopsData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Loops email sent successfully:', loopsData);

    return new Response(
      JSON.stringify({ success: true, messageId: loopsData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending Loops email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Shared authentication utilities for edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
}

/**
 * Validates the JWT from the Authorization header and returns the authenticated user.
 * Use this in all edge functions that require authentication.
 */
export async function getAuthenticatedUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return { user: null, error: 'Missing Authorization header' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  // Create a client with the user's JWT to validate it
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid or expired token' };
  }

  return { user: { id: user.id, email: user.email }, error: null };
}

/**
 * Creates a Supabase client that respects RLS using the user's JWT.
 * Use this instead of service role key when you want RLS to apply.
 */
export function createUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
}

/**
 * Creates an unauthorized response with CORS headers.
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 401, 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json' 
      } 
    }
  );
}

/**
 * Creates a forbidden response with CORS headers.
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status: 403, 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json' 
      } 
    }
  );
}

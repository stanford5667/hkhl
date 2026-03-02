import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData, error: roleError } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roleData?.some(r => r.role === 'admin');
    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all users from auth (includes last_sign_in_at)
    const { data: authUsers, error: authError } = await serviceClient.auth.admin.listUsers();
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get activity stats per user (last active + days active in last 30 days)
    const { data: activityStats, error: activityError } = await serviceClient
      .from('activities')
      .select('user_id, created_at');

    const activityMap: Record<string, { last_active: string; days_active_30d: number }> = {};
    if (activityStats) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Group activities by user
      const userActivities: Record<string, string[]> = {};
      for (const a of activityStats) {
        if (!userActivities[a.user_id]) userActivities[a.user_id] = [];
        userActivities[a.user_id].push(a.created_at);
      }
      
      for (const [userId, dates] of Object.entries(userActivities)) {
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const lastActive = dates[0];
        const uniqueDays = new Set(
          dates
            .filter(d => new Date(d) >= thirtyDaysAgo)
            .map(d => d.slice(0, 10))
        );
        activityMap[userId] = {
          last_active: lastActive,
          days_active_30d: uniqueDays.size,
        };
      }
    }

    const emailMap: Record<string, string> = {};
    const lastSignInMap: Record<string, string | null> = {};
    authUsers.users.forEach((u) => {
      emailMap[u.id] = u.email || '';
      lastSignInMap[u.id] = u.last_sign_in_at || null;
    });

    return new Response(JSON.stringify({ 
      emails: emailMap, 
      lastSignIns: lastSignInMap,
      activityStats: activityMap,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

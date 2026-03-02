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

    // Fetch auth users and profile data in parallel
    const [authResult, profilesResult, activitiesResult] = await Promise.all([
      serviceClient.auth.admin.listUsers(),
      serviceClient.from('profiles').select('user_id, updated_at'),
      // Get all activity timestamps for the last 30 days to compute days_active
      serviceClient
        .from('activities')
        .select('user_id, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    if (authResult.error) {
      console.error('Error fetching auth users:', authResult.error);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authUsers = authResult.data.users;
    const profiles = profilesResult.data || [];
    const recentActivities = activitiesResult.data || [];

    // Build profile updated_at map
    const profileUpdatedMap: Record<string, string> = {};
    for (const p of profiles) {
      profileUpdatedMap[p.user_id] = p.updated_at;
    }

    // Build activity stats: group by user, compute days_active in last 30d and last_activity
    const activityByUser: Record<string, string[]> = {};
    for (const a of recentActivities) {
      if (!activityByUser[a.user_id]) activityByUser[a.user_id] = [];
      activityByUser[a.user_id].push(a.created_at);
    }

    // For each user, compute last_active and days_active_30d
    // last_active = MAX of (auth.last_sign_in_at, profiles.updated_at, latest activity)
    // days_active_30d = unique dates from activities in last 30 days
    //   (we also count last_sign_in_at date and profile updated_at date if in range)
    const emailMap: Record<string, string> = {};
    const lastSignInMap: Record<string, string | null> = {};
    const activityStatsMap: Record<string, { last_active: string | null; days_active_30d: number }> = {};

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const u of authUsers) {
      emailMap[u.id] = u.email || '';
      lastSignInMap[u.id] = u.last_sign_in_at || null;

      // Collect all timestamp candidates for "last active"
      const timestamps: Date[] = [];
      if (u.last_sign_in_at) timestamps.push(new Date(u.last_sign_in_at));
      if (profileUpdatedMap[u.id]) timestamps.push(new Date(profileUpdatedMap[u.id]));
      
      const userActivities = activityByUser[u.id] || [];
      for (const ts of userActivities) {
        timestamps.push(new Date(ts));
      }

      // Determine last_active
      let lastActive: string | null = null;
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => b.getTime() - a.getTime());
        lastActive = timestamps[0].toISOString();
      }

      // Compute days_active_30d: unique calendar days with any activity signal in last 30 days
      const uniqueDays = new Set<string>();
      for (const t of timestamps) {
        if (t >= thirtyDaysAgo) {
          uniqueDays.add(t.toISOString().slice(0, 10));
        }
      }

      activityStatsMap[u.id] = {
        last_active: lastActive,
        days_active_30d: uniqueDays.size,
      };
    }

    return new Response(JSON.stringify({ 
      emails: emailMap, 
      lastSignIns: lastSignInMap,
      activityStats: activityStatsMap,
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

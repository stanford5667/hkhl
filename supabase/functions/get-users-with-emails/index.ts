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

    // Fetch auth users, profiles, activities, and sessions in parallel
    const [authResult, profilesResult, activitiesResult, sessionsResult] = await Promise.all([
      serviceClient.auth.admin.listUsers(),
      serviceClient.from('profiles').select('user_id, updated_at'),
      serviceClient
        .from('activities')
        .select('user_id, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      serviceClient
        .from('user_sessions')
        .select('user_id, started_at, last_heartbeat_at, duration_seconds'),
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
    const sessions = sessionsResult.data || [];

    // Build profile updated_at map
    const profileUpdatedMap: Record<string, string> = {};
    for (const p of profiles) {
      profileUpdatedMap[p.user_id] = p.updated_at;
    }

    // Build activity stats
    const activityByUser: Record<string, string[]> = {};
    for (const a of recentActivities) {
      if (!activityByUser[a.user_id]) activityByUser[a.user_id] = [];
      activityByUser[a.user_id].push(a.created_at);
    }

    // Build session stats per user
    const sessionStatsByUser: Record<string, { total_seconds: number; session_count: number }> = {};
    for (const s of sessions) {
      if (!sessionStatsByUser[s.user_id]) {
        sessionStatsByUser[s.user_id] = { total_seconds: 0, session_count: 0 };
      }
      const duration = s.duration_seconds || 0;
      sessionStatsByUser[s.user_id].total_seconds += duration;
      sessionStatsByUser[s.user_id].session_count += 1;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const emailMap: Record<string, string> = {};
    const lastSignInMap: Record<string, string | null> = {};
    const activityStatsMap: Record<string, { last_active: string | null; days_active_30d: number; total_time_seconds: number; session_count: number; avg_session_seconds: number }> = {};

    for (const u of authUsers) {
      emailMap[u.id] = u.email || '';
      lastSignInMap[u.id] = u.last_sign_in_at || null;

      const timestamps: Date[] = [];
      if (u.last_sign_in_at) timestamps.push(new Date(u.last_sign_in_at));
      if (profileUpdatedMap[u.id]) timestamps.push(new Date(profileUpdatedMap[u.id]));
      
      const userActivities = activityByUser[u.id] || [];
      for (const ts of userActivities) {
        timestamps.push(new Date(ts));
      }

      let lastActive: string | null = null;
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => b.getTime() - a.getTime());
        lastActive = timestamps[0].toISOString();
      }

      const uniqueDays = new Set<string>();
      for (const t of timestamps) {
        if (t >= thirtyDaysAgo) {
          uniqueDays.add(t.toISOString().slice(0, 10));
        }
      }

      const userSessionStats = sessionStatsByUser[u.id] || { total_seconds: 0, session_count: 0 };
      const avgSession = userSessionStats.session_count > 0
        ? Math.round(userSessionStats.total_seconds / userSessionStats.session_count)
        : 0;

      activityStatsMap[u.id] = {
        last_active: lastActive,
        days_active_30d: uniqueDays.size,
        total_time_seconds: userSessionStats.total_seconds,
        session_count: userSessionStats.session_count,
        avg_session_seconds: avgSession,
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

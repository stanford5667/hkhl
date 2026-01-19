import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TierFilter = 'all' | 'free' | 'pro' | 'enterprise';

export interface MetricWithTrend {
  value: number;
  previousValue: number;
  percentChange: number;
  isPositive: boolean;
  isAnomaly: boolean;
  movingAverage30d: number;
}

export interface GrowthMetrics {
  totalUsers: MetricWithTrend;
  newUsersThisWeek: MetricWithTrend;
  signupConversionRate: MetricWithTrend;
  activationRate: MetricWithTrend;
}

export interface RetentionMetrics {
  dailyActiveUsers: MetricWithTrend;
  weeklyActiveUsers: MetricWithTrend;
  monthlyActiveUsers: MetricWithTrend;
  churnRate: MetricWithTrend;
}

export interface SystemHealthMetrics {
  apiSuccessRate: MetricWithTrend;
  avgResponseTime: MetricWithTrend;
  errorRate: MetricWithTrend;
  totalApiCalls: MetricWithTrend;
}

export interface UserWithTier {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  role: string | null;
  tier: 'free' | 'pro' | 'enterprise';
  subscription_status: string | null;
  created_at: string;
  last_active: string | null;
}

export interface CommandCenterData {
  growth: GrowthMetrics;
  retention: RetentionMetrics;
  systemHealth: SystemHealthMetrics;
  users: UserWithTier[];
  tierBreakdown: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

const createEmptyMetric = (): MetricWithTrend => ({
  value: 0,
  previousValue: 0,
  percentChange: 0,
  isPositive: true,
  isAnomaly: false,
  movingAverage30d: 0,
});

const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const isAnomaly = (value: number, movingAvg: number): boolean => {
  if (movingAvg === 0) return false;
  const deviation = Math.abs((value - movingAvg) / movingAvg);
  return deviation > 0.2; // 20% deviation
};

export function useCommandCenterMetrics(tierFilter: TierFilter = 'all') {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all data in parallel
      const [
        profilesRes,
        subscriptionsRes,
        usageRes,
        apiLogsCurrentWeek,
        apiLogsPreviousWeek,
        emailsRes,
        rolesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url, company, created_at'),
        supabase.from('subscriptions').select('user_id, plan, status, current_period_end'),
        supabase.from('user_usage').select('user_id, updated_at'),
        supabase.from('api_usage_logs').select('*').gte('created_at', oneWeekAgo.toISOString()),
        supabase.from('api_usage_logs').select('*').gte('created_at', twoWeeksAgo.toISOString()).lt('created_at', oneWeekAgo.toISOString()),
        supabase.functions.invoke('get-users-with-emails'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const profiles = profilesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const usage = usageRes.data || [];
      const currentWeekLogs = apiLogsCurrentWeek.data || [];
      const previousWeekLogs = apiLogsPreviousWeek.data || [];
      const emailMap: Record<string, string> = emailsRes.data?.emails || {};
      const roles = rolesRes.data || [];

      // Create subscription map
      const subscriptionMap = new Map(
        subscriptions.map(s => [s.user_id, { plan: s.plan, status: s.status }])
      );

      // Create roles map
      const rolesMap = new Map(roles.map(r => [r.user_id, r.role]));

      // Build users with tier info
      const usersWithTier: UserWithTier[] = profiles.map(profile => {
        const sub = subscriptionMap.get(profile.user_id);
        const userUsage = usage.find(u => u.user_id === profile.user_id);
        
        let tier: 'free' | 'pro' | 'enterprise' = 'free';
        if (sub?.status === 'active') {
          if (sub.plan === 'enterprise') tier = 'enterprise';
          else if (sub.plan === 'pro') tier = 'pro';
        }

        return {
          id: profile.user_id,
          email: emailMap[profile.user_id] || null,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          company: profile.company,
          role: rolesMap.get(profile.user_id) || null,
          tier,
          subscription_status: sub?.status || null,
          created_at: profile.created_at,
          last_active: userUsage?.updated_at || null,
        };
      });

      // Filter users by tier
      const filteredUsers = tierFilter === 'all' 
        ? usersWithTier 
        : usersWithTier.filter(u => u.tier === tierFilter);

      // Calculate tier breakdown
      const tierBreakdown = {
        free: usersWithTier.filter(u => u.tier === 'free').length,
        pro: usersWithTier.filter(u => u.tier === 'pro').length,
        enterprise: usersWithTier.filter(u => u.tier === 'enterprise').length,
      };

      // Growth metrics
      const totalUsers = profiles.length;
      const newUsersThisWeek = profiles.filter(p => new Date(p.created_at) >= oneWeekAgo).length;
      const newUsersPreviousWeek = profiles.filter(p => 
        new Date(p.created_at) >= twoWeeksAgo && new Date(p.created_at) < oneWeekAgo
      ).length;

      // Calculate active users by tier if filtered
      const filteredUserIds = new Set(filteredUsers.map(u => u.id));
      const activeToday = usage.filter(u => 
        u.updated_at && 
        new Date(u.updated_at) >= startOfToday &&
        (tierFilter === 'all' || filteredUserIds.has(u.user_id))
      ).length;
      const activeThisWeek = usage.filter(u => 
        u.updated_at && 
        new Date(u.updated_at) >= oneWeekAgo &&
        (tierFilter === 'all' || filteredUserIds.has(u.user_id))
      ).length;
      const activeThisMonth = usage.filter(u => 
        u.updated_at && 
        new Date(u.updated_at) >= oneMonthAgo &&
        (tierFilter === 'all' || filteredUserIds.has(u.user_id))
      ).length;

      // API metrics
      const currentSuccesses = currentWeekLogs.filter(l => l.status_code && l.status_code >= 200 && l.status_code < 300).length;
      const previousSuccesses = previousWeekLogs.filter(l => l.status_code && l.status_code >= 200 && l.status_code < 300).length;
      const currentSuccessRate = currentWeekLogs.length > 0 ? (currentSuccesses / currentWeekLogs.length) * 100 : 100;
      const previousSuccessRate = previousWeekLogs.length > 0 ? (previousSuccesses / previousWeekLogs.length) * 100 : 100;
      
      const currentAvgResponseTime = currentWeekLogs.length > 0 
        ? currentWeekLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / currentWeekLogs.length 
        : 0;
      const previousAvgResponseTime = previousWeekLogs.length > 0 
        ? previousWeekLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / previousWeekLogs.length 
        : 0;

      const currentErrors = currentWeekLogs.filter(l => l.status_code && l.status_code >= 400).length;
      const previousErrors = previousWeekLogs.filter(l => l.status_code && l.status_code >= 400).length;

      // Build metrics with trends
      const growth: GrowthMetrics = {
        totalUsers: {
          value: tierFilter === 'all' ? totalUsers : filteredUsers.length,
          previousValue: tierFilter === 'all' ? totalUsers - newUsersThisWeek : filteredUsers.length,
          percentChange: calculatePercentChange(totalUsers, totalUsers - newUsersThisWeek),
          isPositive: newUsersThisWeek >= 0,
          isAnomaly: isAnomaly(newUsersThisWeek, newUsersPreviousWeek),
          movingAverage30d: newUsersPreviousWeek,
        },
        newUsersThisWeek: {
          value: newUsersThisWeek,
          previousValue: newUsersPreviousWeek,
          percentChange: calculatePercentChange(newUsersThisWeek, newUsersPreviousWeek),
          isPositive: newUsersThisWeek >= newUsersPreviousWeek,
          isAnomaly: isAnomaly(newUsersThisWeek, newUsersPreviousWeek),
          movingAverage30d: newUsersPreviousWeek,
        },
        signupConversionRate: createEmptyMetric(), // Placeholder
        activationRate: {
          value: totalUsers > 0 ? (activeThisWeek / totalUsers) * 100 : 0,
          previousValue: 0,
          percentChange: 0,
          isPositive: true,
          isAnomaly: false,
          movingAverage30d: 0,
        },
      };

      const retention: RetentionMetrics = {
        dailyActiveUsers: {
          value: activeToday,
          previousValue: 0,
          percentChange: 0,
          isPositive: true,
          isAnomaly: false,
          movingAverage30d: activeThisMonth / 30,
        },
        weeklyActiveUsers: {
          value: activeThisWeek,
          previousValue: 0,
          percentChange: 0,
          isPositive: true,
          isAnomaly: false,
          movingAverage30d: activeThisMonth / 4,
        },
        monthlyActiveUsers: {
          value: activeThisMonth,
          previousValue: 0,
          percentChange: 0,
          isPositive: true,
          isAnomaly: false,
          movingAverage30d: activeThisMonth,
        },
        churnRate: createEmptyMetric(),
      };

      const systemHealth: SystemHealthMetrics = {
        apiSuccessRate: {
          value: currentSuccessRate,
          previousValue: previousSuccessRate,
          percentChange: calculatePercentChange(currentSuccessRate, previousSuccessRate),
          isPositive: currentSuccessRate >= previousSuccessRate,
          isAnomaly: isAnomaly(currentSuccessRate, previousSuccessRate),
          movingAverage30d: previousSuccessRate,
        },
        avgResponseTime: {
          value: Math.round(currentAvgResponseTime),
          previousValue: Math.round(previousAvgResponseTime),
          percentChange: calculatePercentChange(currentAvgResponseTime, previousAvgResponseTime),
          isPositive: currentAvgResponseTime <= previousAvgResponseTime,
          isAnomaly: isAnomaly(currentAvgResponseTime, previousAvgResponseTime),
          movingAverage30d: previousAvgResponseTime,
        },
        errorRate: {
          value: currentWeekLogs.length > 0 ? (currentErrors / currentWeekLogs.length) * 100 : 0,
          previousValue: previousWeekLogs.length > 0 ? (previousErrors / previousWeekLogs.length) * 100 : 0,
          percentChange: calculatePercentChange(currentErrors, previousErrors),
          isPositive: currentErrors <= previousErrors,
          isAnomaly: isAnomaly(currentErrors, previousErrors),
          movingAverage30d: previousErrors,
        },
        totalApiCalls: {
          value: currentWeekLogs.length,
          previousValue: previousWeekLogs.length,
          percentChange: calculatePercentChange(currentWeekLogs.length, previousWeekLogs.length),
          isPositive: true,
          isAnomaly: isAnomaly(currentWeekLogs.length, previousWeekLogs.length),
          movingAverage30d: previousWeekLogs.length,
        },
      };

      setData({
        growth,
        retention,
        systemHealth,
        users: filteredUsers,
        tierBreakdown,
      });
    } catch (err) {
      console.error('Error fetching command center metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [tierFilter]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { data, loading, error, refresh: fetchMetrics };
}

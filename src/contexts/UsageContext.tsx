import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UsageLimits {
  aiAnalyses: { used: number; limit: number };
  portfolios: { used: number; limit: number };
  savedScreens: { used: number; limit: number };
  alertsPerDay: { used: number; limit: number };
  quantStudies: { used: number; limit: number };
  screenerSearches: { used: number; limit: number };
}

type SubscriptionPlan = 'free' | 'pro' | 'research_education';

interface UsageContextType {
  usage: UsageLimits;
  isPro: boolean;
  isResearchTier: boolean;
  plan: SubscriptionPlan;
  isLoading: boolean;
  canUse: (feature: keyof UsageLimits) => boolean;
  trackUsage: (feature: keyof UsageLimits) => Promise<boolean>;
  showUpgradeModal: (feature: string) => void;
  refreshUsage: () => Promise<void>;
}

const FREE_LIMITS: UsageLimits = {
  aiAnalyses: { used: 0, limit: 10 },
  portfolios: { used: 0, limit: 3 },
  savedScreens: { used: 0, limit: 5 },
  alertsPerDay: { used: 0, limit: 3 },
  quantStudies: { used: 0, limit: 20 },
  screenerSearches: { used: 0, limit: 5 },
};

const UsageContext = createContext<UsageContextType | null>(null);

interface UsageProviderProps {
  children: ReactNode;
  onUpgradeRequest?: (feature: string) => void;
}

export function UsageProvider({ children, onUpgradeRequest }: UsageProviderProps) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageLimits>(FREE_LIMITS);
  const [plan, setPlan] = useState<SubscriptionPlan>('free');
  const [isLoading, setIsLoading] = useState(true);

  const isPro = plan === 'pro' || plan === 'research_education';
  const isResearchTier = plan === 'research_education';

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setUsage(FREE_LIMITS);
      setPlan('free');
      setIsLoading(false);
      return;
    }

    try {
      // Check subscription status via Stripe
      let userPlan: SubscriptionPlan = 'free';
      try {
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke('check-subscription');
        if (!stripeError && stripeData?.subscribed) {
          if (stripeData.plan === 'research_education') {
            userPlan = 'research_education';
          } else if (stripeData.plan === 'pro') {
            userPlan = 'pro';
          }
        }
      } catch (e) {
        console.error('Error checking Stripe subscription:', e);
        // Fall back to database check
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status, plan')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        if (subscription) {
          userPlan = (subscription.plan as SubscriptionPlan) || 'pro';
        }
      }

      setPlan(userPlan);
      const userIsPro = userPlan === 'pro' || userPlan === 'research_education';

      // Get or create usage record
      let { data: usageData } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!usageData) {
        const { data: newUsage } = await supabase
          .from('user_usage')
          .insert({ user_id: user.id })
          .select()
          .single();
        usageData = newUsage;
      }

      if (usageData) {
        setUsage({
          aiAnalyses: { 
            used: usageData.ai_analyses_today || 0, 
            limit: userIsPro ? Infinity : 10 
          },
          portfolios: { 
            used: usageData.portfolio_count || 0, 
            limit: userIsPro ? Infinity : 3 
          },
          savedScreens: { 
            used: usageData.saved_screens || 0, 
            limit: userIsPro ? Infinity : 5 
          },
          alertsPerDay: { 
            used: usageData.alerts_today || 0, 
            limit: userIsPro ? Infinity : 3 
          },
          quantStudies: { 
            used: usageData.quant_studies_today || 0, 
            limit: userIsPro ? Infinity : 20 
          },
          screenerSearches: { 
            used: (usageData as any).screener_searches_today || 0, 
            limit: userIsPro ? Infinity : 5 
          },
        });
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Auto-refresh subscription status when returning from Stripe checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionStatus = urlParams.get('subscription');
    
    if (subscriptionStatus === 'success') {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      fetchUsage();
    }
  }, [fetchUsage]);

  const canUse = useCallback((feature: keyof UsageLimits): boolean => {
    if (isPro) return true;
    return usage[feature].used < usage[feature].limit;
  }, [isPro, usage]);

  const trackUsage = useCallback(async (feature: keyof UsageLimits): Promise<boolean> => {
    if (!user) return false;
    
    if (!canUse(feature)) {
      onUpgradeRequest?.(feature);
      return false;
    }

    const newUsage = { ...usage };
    newUsage[feature] = { 
      ...newUsage[feature], 
      used: newUsage[feature].used + 1 
    };
    setUsage(newUsage);

    const columnMap: Record<keyof UsageLimits, string> = {
      aiAnalyses: 'ai_analyses_today',
      portfolios: 'portfolio_count',
      savedScreens: 'saved_screens',
      alertsPerDay: 'alerts_today',
      quantStudies: 'quant_studies_today',
      screenerSearches: 'screener_searches_today',
    };

    try {
      await supabase
        .from('user_usage')
        .update({ 
          [columnMap[feature]]: newUsage[feature].used,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error tracking usage:', error);
    }

    return true;
  }, [user, usage, canUse, onUpgradeRequest]);

  const showUpgradeModal = useCallback((feature: string) => {
    onUpgradeRequest?.(feature);
  }, [onUpgradeRequest]);

  const refreshUsage = useCallback(async () => {
    await fetchUsage();
  }, [fetchUsage]);

  return (
    <UsageContext.Provider value={{ 
      usage, 
      isPro,
      isResearchTier,
      plan,
      isLoading, 
      canUse, 
      trackUsage, 
      showUpgradeModal,
      refreshUsage 
    }}>
      {children}
    </UsageContext.Provider>
  );
}

export const useUsage = () => {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error('useUsage must be used within UsageProvider');
  return ctx;
};

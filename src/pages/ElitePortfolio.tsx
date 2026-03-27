import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/shared/PageLoader';
import EliteOnboardingPage from '@/components/elite-assessment/EliteOnboardingPage';
import EliteDashboardPage from '@/components/elite-assessment/EliteDashboardPage';

export default function ElitePortfolio() {
  const { user } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('elite_client_profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasProfile(!!data);
    })();
  }, [user]);

  if (hasProfile === null) return <PageLoader />;

  // If they haven't completed the questionnaire, show it inline
  // Once submitted, refresh to show the dashboard
  if (!hasProfile) {
    return <EliteOnboardingPage onComplete={() => setHasProfile(true)} />;
  }

  return <EliteDashboardPage />;
}

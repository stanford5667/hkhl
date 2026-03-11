import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUsage } from '@/contexts/UsageContext';
import { supabase } from '@/integrations/supabase/client';
import { ProfileSetupStep } from './ProfileSetupStep';
import { MembershipStep } from './MembershipStep';

interface OnboardingFlowProps {
  children: React.ReactNode;
}

export function OnboardingFlow({ children }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { userProfile, isLoading, refreshProfile } = useOrganization();
  const { isPro } = useUsage();
  const [currentStep, setCurrentStep] = useState<'profile' | 'membership' | 'complete'>('profile');

  useEffect(() => {
    if (userProfile) {
      // Check onboarding status
      if (userProfile.onboarding_completed) {
        setCurrentStep('complete');
      } else if (isPro && user) {
        // User has an active subscription but onboarding wasn't marked complete
        // (e.g., returned from Stripe checkout) — auto-complete onboarding
        supabase
          .from('profiles')
          .update({
            membership_tier: 'research_education',
            onboarding_step: 'complete',
            onboarding_completed: true,
          })
          .eq('user_id', user.id)
          .then(() => {
            refreshProfile();
          });
        setCurrentStep('complete');
      } else if (userProfile.onboarding_step === 'membership') {
        setCurrentStep('membership');
      } else if (userProfile.onboarding_step === 'organization' || userProfile.onboarding_step === 'complete') {
        setCurrentStep('membership');
      } else if (userProfile.full_name && userProfile.onboarding_step === 'profile') {
        setCurrentStep('membership');
      }
    }
  }, [userProfile, isPro, user]);

  const handleProfileComplete = () => {
    setCurrentStep('membership');
    refreshProfile();
  };

  const handleMembershipComplete = () => {
    setCurrentStep('complete');
    refreshProfile();
  };

  // Not logged in - allow viewing the app (auth gating happens on actions)
  if (!user) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  // Onboarding complete - show main app (also check isPro as safety net)
  if (currentStep === 'complete' || userProfile?.onboarding_completed || isPro) {
    return <>{children}</>;
  }

  // Show onboarding steps
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`h-2 w-16 rounded-full ${currentStep === 'profile' ? 'bg-purple-500' : 'bg-purple-500'}`} />
          <div className={`h-2 w-16 rounded-full ${currentStep === 'membership' ? 'bg-purple-500' : 'bg-slate-700'}`} />
        </div>

        {currentStep === 'profile' && (
          <div className="max-w-lg mx-auto">
            <ProfileSetupStep onComplete={handleProfileComplete} />
          </div>
        )}

        {currentStep === 'membership' && (
          <MembershipStep 
            onComplete={handleMembershipComplete}
            onBack={() => setCurrentStep('profile')}
          />
        )}
      </div>
    </div>
  );
}

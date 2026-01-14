import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ProfileSetupStep } from './ProfileSetupStep';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingFlowProps {
  children: React.ReactNode;
}

export function OnboardingFlow({ children }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { userProfile, isLoading, refreshProfile } = useOrganization();
  const [currentStep, setCurrentStep] = useState<'profile' | 'complete'>('profile');

  useEffect(() => {
    if (userProfile) {
      if (userProfile.onboarding_completed) {
        setCurrentStep('complete');
      }
    }
  }, [userProfile]);

  const handleProfileComplete = async () => {
    // Mark onboarding as complete after profile setup (skip organization step)
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_step: 'complete'
        })
        .eq('id', user.id);
    }
    setCurrentStep('complete');
    refreshProfile();
  };

  // Not logged in - show children (will redirect to auth)
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

  // Onboarding complete - show main app
  if (currentStep === 'complete' || userProfile?.onboarding_completed) {
    return <>{children}</>;
  }

  // Show profile setup only (organization is optional, can be done later)
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <ProfileSetupStep onComplete={handleProfileComplete} />
      </div>
    </div>
  );
}

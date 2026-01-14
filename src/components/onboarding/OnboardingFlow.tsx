import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ProfileSetupStep } from './ProfileSetupStep';
import { MembershipStep } from './MembershipStep';

interface OnboardingFlowProps {
  children: React.ReactNode;
}

export function OnboardingFlow({ children }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { userProfile, isLoading, refreshProfile } = useOrganization();
  const [currentStep, setCurrentStep] = useState<'profile' | 'membership' | 'complete'>('profile');

  useEffect(() => {
    if (userProfile) {
      // Check onboarding status
      if (userProfile.onboarding_completed) {
        setCurrentStep('complete');
      } else if (userProfile.onboarding_step === 'membership') {
        setCurrentStep('membership');
      } else if (userProfile.onboarding_step === 'organization' || userProfile.onboarding_step === 'complete') {
        // Legacy users who were on organization step - skip to membership
        setCurrentStep('membership');
      }
    }
  }, [userProfile]);

  const handleProfileComplete = () => {
    setCurrentStep('membership');
    refreshProfile();
  };

  const handleMembershipComplete = () => {
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

  // Show onboarding steps
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress indicator */}
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

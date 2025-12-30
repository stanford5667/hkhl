import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ProfileSetupStep } from './ProfileSetupStep';
import { OrganizationStep } from './OrganizationStep';
import { Loader2 } from 'lucide-react';

interface OnboardingFlowProps {
  children: React.ReactNode;
}

export function OnboardingFlow({ children }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { userProfile, isLoading, refreshProfile } = useOrganization();
  const [currentStep, setCurrentStep] = useState<'profile' | 'organization' | 'complete'>('profile');

  useEffect(() => {
    if (userProfile) {
      if (userProfile.onboarding_completed) {
        setCurrentStep('complete');
      } else {
        setCurrentStep(userProfile.onboarding_step as 'profile' | 'organization' | 'complete');
      }
    }
  }, [userProfile]);

  // Not logged in - show children (will redirect to auth)
  if (!user) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
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
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`h-2 w-16 rounded-full ${currentStep === 'profile' ? 'bg-purple-500' : 'bg-purple-500'}`} />
          <div className={`h-2 w-16 rounded-full ${currentStep === 'organization' ? 'bg-purple-500' : 'bg-slate-700'}`} />
        </div>

        {currentStep === 'profile' && (
          <ProfileSetupStep 
            onComplete={() => {
              setCurrentStep('organization');
              refreshProfile();
            }} 
          />
        )}

        {currentStep === 'organization' && (
          <OrganizationStep 
            onComplete={() => {
              setCurrentStep('complete');
              refreshProfile();
            }}
            onBack={() => setCurrentStep('profile')}
          />
        )}
      </div>
    </div>
  );
}

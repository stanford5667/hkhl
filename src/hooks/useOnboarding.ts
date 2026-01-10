import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'asset-labs-onboarding';

interface OnboardingState {
  welcomeCompleted: boolean;
  spotlightDismissed: boolean;
  bannerDismissed: boolean;
  lastVisit: string | null;
  visitCount: number;
}

const defaultState: OnboardingState = {
  welcomeCompleted: false,
  spotlightDismissed: false,
  bannerDismissed: false,
  lastVisit: null,
  visitCount: 0,
};

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasCompletedAssessment, setHasCompletedAssessment] = useState(false);

  // Load state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } catch (e) {
        localStorage.removeItem(ONBOARDING_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

  // Check if user has completed the assessment (golden moment)
  useEffect(() => {
    const checkAssessmentStatus = async () => {
      if (!user) {
        setHasCompletedAssessment(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('investment_plans')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'complete')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          setHasCompletedAssessment(true);
        } else {
          setHasCompletedAssessment(false);
        }
      } catch (e) {
        console.error('Error checking assessment status:', e);
      }
    };

    checkAssessmentStatus();
  }, [user]);

  // Update visit count on mount
  useEffect(() => {
    if (!isLoaded) return;
    
    const now = new Date().toISOString();
    const newState = {
      ...state,
      lastVisit: now,
      visitCount: state.visitCount + 1,
    };
    setState(newState);
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(newState));
  }, [isLoaded]); // Only run once when loaded

  const completeWelcome = useCallback(() => {
    const newState = { ...state, welcomeCompleted: true };
    setState(newState);
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(newState));
  }, [state]);

  const dismissSpotlight = useCallback(() => {
    const newState = { ...state, spotlightDismissed: true };
    setState(newState);
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(newState));
  }, [state]);

  const dismissBanner = useCallback(() => {
    const newState = { ...state, bannerDismissed: true };
    setState(newState);
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(newState));
  }, [state]);

  const resetOnboarding = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(ONBOARDING_KEY);
  }, []);

  // Show welcome modal on first visit
  const shouldShowWelcome = isLoaded && !state.welcomeCompleted && state.visitCount <= 1;

  // Show spotlight if welcome completed but spotlight not dismissed
  // and user hasn't completed assessment and has visited less than 10 times
  const shouldShowSpotlight = isLoaded && 
    state.welcomeCompleted && 
    !state.spotlightDismissed && 
    !hasCompletedAssessment &&
    state.visitCount < 10;

  // Show banner if welcome completed but banner not dismissed
  // and user hasn't completed assessment
  const shouldShowBanner = isLoaded && 
    state.welcomeCompleted && 
    !state.bannerDismissed &&
    state.visitCount < 15;

  return {
    isLoaded,
    state,
    hasCompletedAssessment,
    shouldShowWelcome,
    shouldShowSpotlight,
    shouldShowBanner,
    completeWelcome,
    dismissSpotlight,
    dismissBanner,
    resetOnboarding,
  };
}

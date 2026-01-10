import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ONBOARDING_KEY = 'asset-labs-onboarding';
const SPOTLIGHT_DISMISSED_KEY = 'asset-labs-spotlight-dismissed';

interface OnboardingState {
  welcomeCompleted: boolean;
  spotlightDismissed: boolean;
  lastVisit: string | null;
  visitCount: number;
}

const defaultState: OnboardingState = {
  welcomeCompleted: false,
  spotlightDismissed: false,
  lastVisit: null,
  visitCount: 0,
};

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } catch (e) {
        // Invalid JSON, reset
        localStorage.removeItem(ONBOARDING_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

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

  const resetOnboarding = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(ONBOARDING_KEY);
  }, []);

  // Determine if we should show welcome modal
  // Show if: first visit OR user is logged in and hasn't completed welcome
  const shouldShowWelcome = isLoaded && !state.welcomeCompleted && state.visitCount <= 1;

  // Show spotlight if welcome completed but spotlight not dismissed
  // and user has visited less than 5 times
  const shouldShowSpotlight = isLoaded && 
    state.welcomeCompleted && 
    !state.spotlightDismissed && 
    state.visitCount < 5;

  return {
    isLoaded,
    state,
    shouldShowWelcome,
    shouldShowSpotlight,
    completeWelcome,
    dismissSpotlight,
    resetOnboarding,
  };
}

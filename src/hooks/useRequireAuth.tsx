import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback, useEffect } from "react";

// Store pending navigation/action in sessionStorage to survive auth flow
const PENDING_ACTION_KEY = 'pending-auth-action';

interface PendingAction {
  type: string;
  timestamp: number;
}

export function useRequireAuth() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const requireAuth = useCallback(<T = void>(action: () => T, actionType?: string): T | undefined => {
    if (user) {
      return action();
    } else {
      // Store the action type so we can resume after auth
      if (actionType) {
        sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify({
          type: actionType,
          timestamp: Date.now()
        }));
      }
      setShowAuthDialog(true);
    }
  }, [user]);

  const closeAuthDialog = useCallback(() => {
    setShowAuthDialog(false);
  }, []);

  // Get and clear any pending action after auth
  const consumePendingAction = useCallback((): string | null => {
    const stored = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (stored) {
      sessionStorage.removeItem(PENDING_ACTION_KEY);
      try {
        const parsed: PendingAction = JSON.parse(stored);
        // Only consume if within last 5 minutes (300000ms)
        if (Date.now() - parsed.timestamp < 300000) {
          return parsed.type;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    return null;
  }, []);

  return {
    isAuthenticated: !!user,
    requireAuth,
    showAuthDialog,
    closeAuthDialog,
    consumePendingAction,
  };
}

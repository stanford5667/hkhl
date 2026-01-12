import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback, useRef, useEffect } from "react";

export function useRequireAuth() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const wasAuthenticating = useRef(false);

  const requireAuth = useCallback((action: () => void) => {
    if (user) {
      action();
    } else {
      pendingActionRef.current = action;
      wasAuthenticating.current = true;
      setShowAuthDialog(true);
    }
  }, [user]);

  // Execute pending action when user becomes authenticated
  useEffect(() => {
    if (user && wasAuthenticating.current && pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      wasAuthenticating.current = false;
      // Small delay to ensure auth state is fully propagated
      setTimeout(() => action(), 100);
    }
  }, [user]);

  const closeAuthDialog = useCallback(() => {
    setShowAuthDialog(false);
  }, []);

  return {
    isAuthenticated: !!user,
    requireAuth,
    showAuthDialog,
    closeAuthDialog,
  };
}

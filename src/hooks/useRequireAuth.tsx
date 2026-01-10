import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback } from "react";

export function useRequireAuth() {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const requireAuth = useCallback((action: () => void) => {
    if (user) {
      action();
    } else {
      setShowAuthDialog(true);
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

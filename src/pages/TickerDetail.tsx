import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';
import PublicStockView from './PublicStockView';

/**
 * TickerDetail - Shows the stock page but gates interaction behind auth.
 * Unauthenticated users see the overview with a sign-in dialog overlay.
 */
export default function TickerDetail() {
  const { user } = useAuth();
  const { showAuthDialog, closeAuthDialog, requireAuth } = useRequireAuth();

  return (
    <>
      <PublicStockView />

      {/* Auto-open auth gate for unauthenticated users */}
      {!user && (
        <AuthGateOverlay requireAuth={requireAuth} showAuthDialog={showAuthDialog} closeAuthDialog={closeAuthDialog} />
      )}
    </>
  );
}

/** Triggers the auth dialog on mount for unauth users */
function AuthGateOverlay({ requireAuth, showAuthDialog, closeAuthDialog }: {
  requireAuth: (action: () => void, type?: string) => void;
  showAuthDialog: boolean;
  closeAuthDialog: () => void;
}) {
  // Fire once on mount
  const hasTriggered = useRef(false);
  if (!hasTriggered.current) {
    hasTriggered.current = true;
    // Use setTimeout to avoid calling during render
    setTimeout(() => requireAuth(() => {}, 'view-stock'), 0);
  }

  return (
    <AuthGateDialog
      open={showAuthDialog}
      onOpenChange={closeAuthDialog}
      title="Sign in to continue"
      description="Create a free account to access full stock analysis, AI predictions, and more."
    />
  );
}

import { useRef } from 'react';

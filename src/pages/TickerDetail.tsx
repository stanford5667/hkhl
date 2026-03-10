import { useRef } from 'react';
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
  const hasTriggered = useRef(false);

  // Auto-trigger auth dialog for unauthenticated users (once)
  if (!user && !hasTriggered.current) {
    hasTriggered.current = true;
    setTimeout(() => requireAuth(() => {}, 'view-stock'), 0);
  }

  return (
    <>
      <PublicStockView />
      <AuthGateDialog
        open={showAuthDialog}
        onOpenChange={closeAuthDialog}
        title="Sign in to continue"
        description="Create a free account to access full stock analysis, AI predictions, and more."
      />
    </>
  );
}

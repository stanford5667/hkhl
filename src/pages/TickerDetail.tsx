import { useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';
import PublicStockView from './PublicStockView';

/**
 * TickerDetail - Shows the stock page and gates interaction behind auth.
 * Unauthenticated users can browse for 5 seconds before the sign-in dialog appears.
 */
export default function TickerDetail() {
  const { user } = useAuth();
  const { showAuthDialog, closeAuthDialog, requireAuth } = useRequireAuth();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (user || hasTriggered.current) return;
    hasTriggered.current = true;

    const timer = setTimeout(() => {
      requireAuth(() => {}, 'view-stock');
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, requireAuth]);

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

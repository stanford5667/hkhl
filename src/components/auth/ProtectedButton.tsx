import { forwardRef, ComponentPropsWithoutRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from './AuthGateDialog';

interface ProtectedButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  authTitle?: string;
  authDescription?: string;
  actionType?: string;
}

/**
 * A Button that requires authentication before executing onClick.
 * Shows an auth dialog if the user is not signed in.
 */
export const ProtectedButton = forwardRef<HTMLButtonElement, ProtectedButtonProps>(
  ({ 
    onClick, 
    authTitle = "Sign in required",
    authDescription = "Create a free account to use this feature.",
    actionType,
    children,
    ...props 
  }, ref) => {
    const { isAuthenticated, requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isAuthenticated) {
        onClick?.(e);
      } else {
        e.preventDefault();
        e.stopPropagation();
        requireAuth(() => onClick?.(e as any), actionType);
      }
    };

    return (
      <>
        <Button ref={ref} onClick={handleClick} {...props}>
          {children}
        </Button>
        {!isAuthenticated && (
          <AuthGateDialog
            open={showAuthDialog}
            onOpenChange={closeAuthDialog}
            title={authTitle}
            description={authDescription}
          />
        )}
      </>
    );
  }
);

ProtectedButton.displayName = 'ProtectedButton';

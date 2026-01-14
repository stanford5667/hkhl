import { ReactNode, cloneElement, isValidElement } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from './AuthGateDialog';

interface ProtectedActionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actionType?: string;
}

/**
 * Wraps any interactive element and requires authentication before allowing the action.
 * Shows an auth dialog if the user is not signed in.
 * 
 * Usage:
 * <ProtectedAction title="Sign in to save" description="Create an account to save your work.">
 *   <Button onClick={handleSave}>Save</Button>
 * </ProtectedAction>
 */
export function ProtectedAction({ 
  children, 
  title = "Sign in required",
  description = "Create a free account to use this feature.",
  actionType
}: ProtectedActionProps) {
  const { isAuthenticated, requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();

  // If authenticated, just render children normally
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated, intercept the click
  if (isValidElement(children)) {
    const originalOnClick = (children.props as any).onClick;
    
    const wrappedElement = cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        requireAuth(() => {
          if (originalOnClick) {
            originalOnClick(e);
          }
        }, actionType);
      }
    });

    return (
      <>
        {wrappedElement}
        <AuthGateDialog
          open={showAuthDialog}
          onOpenChange={closeAuthDialog}
          title={title}
          description={description}
        />
      </>
    );
  }

  return <>{children}</>;
}

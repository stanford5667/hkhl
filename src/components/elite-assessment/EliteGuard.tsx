import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEliteAccess } from '@/hooks/useEliteAccess';
import { PageLoader } from '@/components/shared/PageLoader';

interface EliteGuardProps {
  children: React.ReactNode;
}

export function EliteGuard({ children }: EliteGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isElite, loading: roleLoading } = useEliteAccess();

  if (authLoading || roleLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isElite) return <Navigate to="/" replace />;

  return <>{children}</>;
}

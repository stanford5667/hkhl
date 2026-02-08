import { lazy } from 'react';

const CommunityHub = lazy(() => import('@/components/community/CommunityHub').then(m => ({ default: m.CommunityHub })));

export default function Community() {
  return <CommunityHub />;
}

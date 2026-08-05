import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/shared/PageLoader";

const Research = lazy(() => import("@/pages/Research"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));

/**
 * "/" renders the marketing landing page for cold (logged-out) visitors and the
 * internal Research tool for authenticated users. While the session is being
 * restored we render the page loader so signed-in users never see a flash of
 * the marketing page.
 */
export default function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      {user ? <Research /> : <LandingPage />}
    </Suspense>
  );
}

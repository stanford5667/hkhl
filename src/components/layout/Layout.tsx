import { ReactNode, useState, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { TickerStream } from "@/components/ui/TickerStream";
import { FloatingHelpWidget } from "@/components/support/FloatingHelpWidget";
import { FloatingChatBubble } from "@/components/community/chat/FloatingChatBubble";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { UniversalCreateMenu } from "@/components/shared/UniversalCreateMenu";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { toast } from "sonner";
import { AuthGateDialog } from "@/components/auth/AuthGateDialog";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickStartBanner } from "@/components/onboarding/QuickStartBanner";
import { useOnboarding } from "@/hooks/useOnboarding";
import { FooterDisclaimer } from "@/components/legal";
import { MarketingLandingPage } from "@/components/landing/MarketingLandingPage";
import { useEventNotifications } from "@/hooks/useEventNotifications";
import { useActivityHeartbeat } from "@/hooks/useActivityHeartbeat";
import { useGlobalScrollPersistence } from "@/hooks/useScrollPersistence";
import { cn } from "@/lib/utils";
import { BacktestPromoToast } from "@/components/ui/BacktestPromoToast";
import { useAffiliateTracking } from "@/hooks/useAffiliateTracking";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { loading, user } = useAuth();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isSplitScrollRoute = (location.pathname === "/" && !!user) || location.pathname === "/quant-lab";
  // Onboarding state (we only use the banner; all modals/popups are disabled)
  const { 
    shouldShowBanner,
    hasCompletedAssessment,
    dismissBanner,
  } = useOnboarding();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useAffiliateTracking();

  // After auth, redirect to any pending navigation target
  useEffect(() => {
    if (!user) return;
    const pendingNav = sessionStorage.getItem('pending-navigation');
    if (pendingNav) {
      sessionStorage.removeItem('pending-navigation');
      navigate(pendingNav);
    }
  }, [user, navigate]);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enable event notifications (checks for upcoming events and shows toasts)
  useEventNotifications();

  // Persist scroll position across navigation
  useGlobalScrollPersistence();

  // Keep "Last active" analytics accurate while users are actively using the app
  useActivityHeartbeat(user?.id ?? null, location.pathname);

  // Create handlers - no auth required for navigation
  const handleCreateCompany = () => {
    navigate('/companies?create=true');
  };

  const handleCreateContact = (companyId?: string) => {
    const params = companyId ? `?create=true&companyId=${companyId}` : '?create=true';
    navigate(`/contacts${params}`);
  };

  const handleCreateTask = (companyId?: string, contactId?: string) => {
    const params = new URLSearchParams();
    params.set('create', 'true');
    if (companyId) params.set('companyId', companyId);
    if (contactId) params.set('contactId', contactId);
    navigate(`/tasks?${params.toString()}`);
  };

  const handleUploadDocument = (companyId?: string) => {
    if (companyId) {
      navigate(`/portfolio/${companyId}?tab=dataroom&upload=true`);
    } else {
      toast.info('Select a company first to upload documents');
      navigate('/portfolio');
    }
  };


  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth page, verify-email, and reset-password don't need the layout
  if (location.pathname === "/auth" || location.pathname === "/verify-email" || location.pathname === "/reset-password") {
    return <>{children}</>;
  }

  // Unauthenticated users see only the landing page
  if (!user) {
    // Allow legal/public pages through without landing redirect
    const publicPaths = ["/terms", "/privacy", "/disclosures", "/landing", "/management-fee", "/sms-consent"];
    const isPublicPath = publicPaths.includes(location.pathname) || location.pathname.startsWith("/academy");
    if (isPublicPath) {
      return <>{children}</>;
    }
    return <MarketingLandingPage />;
  }

  // If user is logged in but email not verified, show verification pending screen
  // Only gate if user exists AND has a pending verification record
  // (Skip this check for users who registered before verification was implemented)
  // For now, allow all authenticated users through - verification is optional

  // Allow browsing without authentication - removed redirect

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex flex-col flex-1 min-w-0">
        {/* Ticker stream - hidden on mobile */}
        <div className="hidden sm:block">
          <TickerStream />
        </div>
        <TopBar onOpenSearch={() => setSearchOpen(true)} />
        
        {/* Quick Start Banner for new users */}
        {!isMobile && (
          <QuickStartBanner
            show={shouldShowBanner}
            onDismiss={dismissBanner}
            hasCompletedAssessment={hasCompletedAssessment}
          />
        )}
        <main className={cn("flex-1 custom-scrollbar pb-16 md:pb-0 flex flex-col", isSplitScrollRoute ? "overflow-hidden" : "overflow-auto")}>
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      {isMobile && <MobileNav />}
      
      
      {/* Global dialogs */}
      <UniversalCreateMenu
        open={createMenuOpen}
        onOpenChange={setCreateMenuOpen}
        onCreateCompany={handleCreateCompany}
        onCreateContact={handleCreateContact}
        onCreateTask={handleCreateTask}
        onUploadDocument={handleUploadDocument}
      />
      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
      <FloatingHelpWidget />
      <FloatingChatBubble />
      {!user && <BacktestPromoToast />}
      
      {/* Auth gate dialog */}
      <AuthGateDialog 
        open={showAuthDialog} 
        onOpenChange={closeAuthDialog}
      />
    </div>
  );
}

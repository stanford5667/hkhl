import { ReactNode, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { TickerStream } from "@/components/ui/TickerStream";
import { FloatingHelpWidget } from "@/components/support/FloatingHelpWidget";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { UniversalCreateMenu } from "@/components/shared/UniversalCreateMenu";
import { EnhancedGlobalSearch, useSearchShortcut } from "@/components/shared/EnhancedGlobalSearch";
import { toast } from "sonner";
import { AuthGateDialog } from "@/components/auth/AuthGateDialog";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { FeatureSpotlight } from "@/components/onboarding/FeatureSpotlight";
import { QuickStartBanner } from "@/components/onboarding/QuickStartBanner";
import { useOnboarding } from "@/hooks/useOnboarding";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { loading } = useAuth();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Onboarding state
  const { 
    shouldShowWelcome, 
    shouldShowSpotlight,
    shouldShowBanner,
    hasCompletedAssessment,
    completeWelcome, 
    dismissSpotlight,
    dismissBanner
  } = useOnboarding();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  
  // Show welcome modal on first visit
  useEffect(() => {
    if (shouldShowWelcome) {
      setWelcomeOpen(true);
    }
  }, [shouldShowWelcome]);
  
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Use the search shortcut hook
  useSearchShortcut(() => setSearchOpen(true));

  // Create handlers - now wrapped with requireAuth
  const handleCreateCompany = () => {
    requireAuth(() => navigate('/companies?create=true'));
  };

  const handleCreateContact = (companyId?: string) => {
    requireAuth(() => {
      const params = companyId ? `?create=true&companyId=${companyId}` : '?create=true';
      navigate(`/contacts${params}`);
    });
  };

  const handleCreateTask = (companyId?: string, contactId?: string) => {
    requireAuth(() => {
      const params = new URLSearchParams();
      params.set('create', 'true');
      if (companyId) params.set('companyId', companyId);
      if (contactId) params.set('contactId', contactId);
      navigate(`/tasks?${params.toString()}`);
    });
  };

  const handleUploadDocument = (companyId?: string) => {
    requireAuth(() => {
      if (companyId) {
        navigate(`/portfolio/${companyId}?tab=dataroom&upload=true`);
      } else {
        toast.info('Select a company first to upload documents');
        navigate('/portfolio');
      }
    });
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth page doesn't need the layout
  if (location.pathname === "/auth") {
    return <>{children}</>;
  }

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
        <TopBar />
        
        {/* Quick Start Banner for new users */}
        <QuickStartBanner 
          show={shouldShowBanner} 
          onDismiss={dismissBanner}
          hasCompletedAssessment={hasCompletedAssessment}
        />
        
        <main className="flex-1 overflow-auto custom-scrollbar pb-16 md:pb-0">
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      {isMobile && <MobileNav />}
      
      {/* Welcome Modal for first-time users */}
      <WelcomeModal 
        open={welcomeOpen}
        onOpenChange={setWelcomeOpen}
        onComplete={completeWelcome}
      />
      
      {/* Feature Spotlight for guiding users to golden moment */}
      <FeatureSpotlight 
        show={shouldShowSpotlight}
        onDismiss={dismissSpotlight}
        hasCompletedAssessment={hasCompletedAssessment}
      />
      
      {/* Global dialogs */}
      <UniversalCreateMenu
        open={createMenuOpen}
        onOpenChange={setCreateMenuOpen}
        onCreateCompany={handleCreateCompany}
        onCreateContact={handleCreateContact}
        onCreateTask={handleCreateTask}
        onUploadDocument={handleUploadDocument}
      />
      <EnhancedGlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
      <FloatingHelpWidget />
      
      {/* Auth gate dialog */}
      <AuthGateDialog 
        open={showAuthDialog} 
        onOpenChange={closeAuthDialog}
      />
    </div>
  );
}

import { ReactNode, useState, useEffect } from "react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { UniversalCreateMenu } from "@/components/shared/UniversalCreateMenu";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { toast } from "sonner";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcut for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Create handlers
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
      navigate(`/companies/${companyId}?tab=dataroom&upload=true`);
    } else {
      toast.info('Select a company first to upload documents');
      navigate('/companies');
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

  // Auth page doesn't need the layout
  if (location.pathname === "/auth") {
    return <>{children}</>;
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto custom-scrollbar">
          {children}
        </main>
      </div>
      
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
    </div>
  );
}

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Layout } from "@/components/layout/Layout";
import Index from "./pages/Index";
import Pipeline from "./pages/Pipeline";
import Models from "./pages/Models";
import NewModel from "./pages/NewModel";
import ModelEditor from "./pages/ModelEditor";
import Portfolio from "./pages/Portfolio";
import DataRoom from "./pages/DataRoom";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Contacts from "./pages/Contacts";
import MarketIntel from "./pages/MarketIntel";
import DealMatching from "./pages/DealMatching";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import OrganizationSettings from "./pages/OrganizationSettings";
import CashFlowBuildupPage from "./pages/CashFlowBuildupPage";
import ModelViewerPage from "./pages/ModelViewerPage";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <UnifiedDataProvider>
              <OnboardingFlow>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/pipeline" element={<Pipeline />} />
                    <Route path="/models" element={<Models />} />
                    <Route path="/models/new" element={<NewModel />} />
                    <Route path="/models/:modelId/edit" element={<ModelEditor />} />
                    <Route path="/models/cash-flow-buildup" element={<CashFlowBuildupPage />} />
                    <Route path="/models/view/:modelId" element={<ModelViewerPage />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/documents" element={<DataRoom />} />
                    <Route path="/companies" element={<Companies />} />
                    <Route path="/companies/:id" element={<CompanyDetail />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/market-intel" element={<MarketIntel />} />
                    <Route path="/deal-matching" element={<DealMatching />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/settings/organization" element={<OrganizationSettings />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </OnboardingFlow>
            </UnifiedDataProvider>
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

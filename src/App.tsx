import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Layout } from "@/components/layout/Layout";
import { DevModeToggle } from "@/components/dev/DevModeToggle";
import { DevModeSyncWrapper } from "@/components/dev/DevModeSyncWrapper";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import Pipeline from "./pages/Pipeline";
import Models from "./pages/Models";
import NewModel from "./pages/NewModel";
import ModelEditor from "./pages/ModelEditor";
import Portfolio from "./pages/Portfolio";
import DataRoom from "./pages/DataRoom";
import CompanyDetail from "./pages/CompanyDetail";
import { CompanyRedirect } from "./components/shared/CompanyRedirect";
import Contacts from "./pages/Contacts";
import MarketIntel from "./pages/MarketIntel";
import DealMatching from "./pages/DealMatching";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import OrganizationSettings from "./pages/OrganizationSettings";
import CashFlowBuildupPage from "./pages/CashFlowBuildupPage";
import ModelViewerPage from "./pages/ModelViewerPage";
import Tasks from "./pages/Tasks";
import Research from "./pages/Research";
import Backtester from "./pages/Backtester";
import PortfolioBacktester from "./pages/PortfolioBacktester";
import Backtest from "./pages/Backtest";
import Watchlist from "./pages/Watchlist";
import Screener from "./pages/Screener";
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
              <DevModeProvider>
                <DevModeSyncWrapper />
                <OnboardingFlow>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<EnhancedDashboard />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/pipeline" element={<Pipeline />} />
                      <Route path="/portfolio" element={<Portfolio />} />
                      <Route path="/assets" element={<Portfolio />} />
                      <Route path="/portfolio/:id" element={<CompanyDetail />} />
                      <Route path="/contacts" element={<Contacts />} />
                      <Route path="/tasks" element={<Tasks />} />
                      <Route path="/documents" element={<DataRoom />} />
                      <Route path="/models" element={<Models />} />
                      <Route path="/models/new" element={<NewModel />} />
                      <Route path="/models/:modelId/edit" element={<ModelEditor />} />
                      <Route path="/models/cash-flow-buildup" element={<CashFlowBuildupPage />} />
                      <Route path="/models/view/:modelId" element={<ModelViewerPage />} />
                      <Route path="/market-intel" element={<MarketIntel />} />
                      <Route path="/deal-matching" element={<DealMatching />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/organization" element={<OrganizationSettings />} />
                      <Route path="/research" element={<Research />} />
                      <Route path="/backtester" element={<PortfolioBacktester />} />
                      <Route path="/strategy-tester" element={<Backtester />} />
                      <Route path="/backtest" element={<Backtest />} />
                      <Route path="/watchlist" element={<Watchlist />} />
                      <Route path="/screener" element={<Screener />} />
                      {/* Redirects from old routes */}
                      <Route path="/companies" element={<Navigate to="/portfolio" replace />} />
                      <Route path="/companies/:id" element={<CompanyRedirect />} />
                      <Route path="/markets" element={<Navigate to="/portfolio" replace />} />
                      <Route path="/holdings" element={<Navigate to="/portfolio" replace />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                  <DevModeToggle />
                </OnboardingFlow>
              </DevModeProvider>
            </UnifiedDataProvider>
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

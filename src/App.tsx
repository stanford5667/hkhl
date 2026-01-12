import { lazy, Suspense, useState, useCallback } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { UnifiedDataProvider } from "@/contexts/UnifiedDataContext";
import { DevModeProvider } from "@/contexts/DevModeContext";
import { UsageProvider } from "@/contexts/UsageContext";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { Layout } from "@/components/layout/Layout";
import { DevModeToggle } from "@/components/dev/DevModeToggle";
import { DevModeSyncWrapper } from "@/components/dev/DevModeSyncWrapper";
import { CompanyRedirect } from "./components/shared/CompanyRedirect";
import { PageLoader } from "@/components/shared/PageLoader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { UpgradeModal } from "@/components/premium/UpgradeModal";

// Lazy load all pages for code splitting
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Models = lazy(() => import('./pages/Models'));
const NewModel = lazy(() => import('./pages/NewModel'));
const ModelEditor = lazy(() => import('./pages/ModelEditor'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const DataRoom = lazy(() => import('./pages/DataRoom'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Contacts = lazy(() => import('./pages/Contacts'));
const MarketIntel = lazy(() => import('./pages/MarketIntel'));
const DealMatching = lazy(() => import('./pages/DealMatching'));
const Auth = lazy(() => import('./pages/Auth'));
const Settings = lazy(() => import('./pages/Settings'));
const OrganizationSettings = lazy(() => import('./pages/OrganizationSettings'));
const CashFlowBuildupPage = lazy(() => import('./pages/CashFlowBuildupPage'));
const ModelViewerPage = lazy(() => import('./pages/ModelViewerPage'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Research = lazy(() => import('./pages/Research'));
const AssetResearch = lazy(() => import('./pages/AssetResearch'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const TickerDetail = lazy(() => import('./pages/TickerDetail'));
const PortfolioVisualizer = lazy(() => import('./pages/PortfolioVisualizer'));
const PredictionMarketsAI = lazy(() => import('./pages/PredictionMarketsAI'));
const DiscoveryHub = lazy(() => import('./pages/DiscoveryHub'));
const NewsIntelligence = lazy(() => import('./pages/NewsIntelligence'));
const InvestmentPlan = lazy(() => import('./pages/InvestmentPlan'));
const SupportCenter = lazy(() => import('./pages/SupportCenter'));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Optimized QueryClient with caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes default
      gcTime: 30 * 60 * 1000, // Keep unused data for 30 min
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch when tab gets focus
    },
  },
});

const App = () => {
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  
  const handleUpgradeRequest = useCallback((feature: string) => {
    setUpgradeFeature(feature);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <OrganizationProvider>
                <UnifiedDataProvider>
                  <DevModeProvider>
                    <UsageProvider onUpgradeRequest={handleUpgradeRequest}>
                      <DevModeSyncWrapper />
                      <OnboardingFlow>
                        <Layout>
                          <Suspense fallback={<PageLoader />}>
                            <Routes>
                              <Route path="/" element={<Portfolio />} />
                              <Route path="/news" element={<NewsIntelligence />} />
                              <Route path="/auth" element={<Auth />} />
                              <Route path="/pipeline" element={<Pipeline />} />
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
                              <Route path="/asset-research" element={<AssetResearch />} />
                              <Route path="/watchlist" element={<Watchlist />} />
                              <Route path="/screener" element={<Navigate to="/asset-research" replace />} />
                              <Route path="/stock/:ticker" element={<TickerDetail />} />
                              <Route path="/portfolio-visualizer" element={<PortfolioVisualizer />} />
                              <Route path="/prediction-ai" element={<PredictionMarketsAI />} />
                              <Route path="/discovery" element={<DiscoveryHub />} />
                              <Route path="/investment-plan" element={<InvestmentPlan />} />
                              {/* Backward-compatible short link */}
                              <Route path="/plan" element={<Navigate to="/investment-plan" replace />} />
                              <Route path="/support" element={<SupportCenter />} />
                              <Route path="/admin" element={<AdminPortal />} />
                              {/* Redirects from old routes */}
                              <Route path="/portfolio" element={<Navigate to="/" replace />} />
                              <Route path="/companies" element={<Navigate to="/" replace />} />
                              <Route path="/companies/:id" element={<CompanyRedirect />} />
                              <Route path="/markets" element={<Navigate to="/" replace />} />
                              <Route path="/holdings" element={<Navigate to="/" replace />} />
                              <Route path="/backtester" element={<Navigate to="/portfolio-visualizer" replace />} />
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </Layout>
                        <DevModeToggle />
                      </OnboardingFlow>
                      <UpgradeModal 
                        isOpen={!!upgradeFeature}
                        feature={upgradeFeature || ''}
                        onClose={() => setUpgradeFeature(null)}
                      />
                    </UsageProvider>
                  </DevModeProvider>
                </UnifiedDataProvider>
              </OrganizationProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

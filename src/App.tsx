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
// ScrollToTop removed - using useGlobalScrollPersistence in Layout instead
import { UpgradeModal } from "@/components/premium/UpgradeModal";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { GlobalUploadProgress } from "@/components/admin/GlobalUploadProgress";
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
const QuantLab = lazy(() => import('./pages/QuantLab'));
const BacktesterPage = lazy(() => import('./pages/Backtester'));
const Terms = lazy(() => import('./pages/Terms'));
const Disclosures = lazy(() => import('./pages/Disclosures'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Glossary = lazy(() => import('./pages/Glossary'));
const Builder = lazy(() => import('./pages/Builder'));
const Charting = lazy(() => import('./pages/Charting'));
const MultiChart = lazy(() => import('./pages/MultiChart'));
const NotFound = lazy(() => import('./pages/NotFound'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Academy = lazy(() => import('./pages/Academy'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const LessonView = lazy(() => import('./pages/LessonView'));
const QuizView = lazy(() => import('./pages/QuizView'));
const StudyMaterials = lazy(() => import('./pages/StudyMaterials'));
const Community = lazy(() => import('./pages/Community'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const StockDiscovery = lazy(() => import('./pages/StockDiscovery'));
const ThemeAnalysis = lazy(() => import('./pages/ThemeAnalysis'));
const SharedThemeAnalysis = lazy(() => import('./pages/SharedThemeAnalysis'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Upgrade = lazy(() => import('./pages/Upgrade'));
const Affiliate = lazy(() => import('./pages/Affiliate'));
const InvestmentHeatmap = lazy(() => import('./pages/InvestmentHeatmap'));
const ManagementFee = lazy(() => import('./pages/ManagementFee'));
const SmsConsent = lazy(() => import('./pages/SmsConsent'));
const SimTrading = lazy(() => import('./pages/SimTrading'));
const MyResearch = lazy(() => import('./pages/MyResearch'));
const OptionsAnalyzerPage = lazy(() => import('./pages/OptionsAnalyzer'));
const SmartMoney = lazy(() => import('./pages/SmartMoney'));
const EliteOnboarding = lazy(() => import('./pages/EliteOnboarding'));
const EliteDashboard = lazy(() => import('./pages/EliteDashboard'));
const ElitePortfolio = lazy(() => import('./pages/ElitePortfolio'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));
import { EliteGuard } from '@/components/elite-assessment/EliteGuard';

// Optimized QueryClient with aggressive caching and deduplication
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays "fresh" and won't refetch
      gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 min
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch when tab gets focus
      refetchOnMount: false, // Don't refetch when component remounts
      refetchOnReconnect: false, // Don't refetch on network reconnect
      networkMode: 'offlineFirst', // Use cache first, then network
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
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {/* ScrollToTop removed - scroll persistence is now handled in Layout via useGlobalScrollPersistence */}
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
                              <Route path="/" element={<Research />} />
                              <Route path="/news" element={<NewsIntelligence />} />
                              <Route path="/auth" element={<Auth />} />
                              <Route path="/reset-password" element={<ResetPassword />} />
                              <Route path="/verify-email" element={<VerifyEmail />} />
                              <Route path="/upgrade" element={<Upgrade />} />
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
                              <Route path="/quant-lab" element={<QuantLab />} />
                              <Route path="/backtester" element={<BacktesterPage />} />
                              <Route path="/builder" element={<Builder />} />
                              <Route path="/chart" element={<Charting />} />
                              <Route path="/charts" element={<MultiChart />} />
                              <Route path="/academy" element={<Academy />} />
                              <Route path="/academy/course/:courseId" element={<CourseDetail />} />
                              <Route path="/academy/lesson/:lessonId" element={<LessonView />} />
                              <Route path="/academy/quiz/:quizId" element={<QuizView />} />
                              <Route path="/academy/materials" element={<StudyMaterials />} />
                              <Route path="/community" element={<Community />} />
                              <Route path="/community/chat/:roomId" element={<Community />} />
                              <Route path="/community/posts" element={<Community />} />
                              <Route path="/community/posts/:postId" element={<Community />} />
                              <Route path="/community/new-post" element={<Community />} />
                              <Route path="/terms" element={<Terms />} />
                              <Route path="/disclosures" element={<Disclosures />} />
                              <Route path="/privacy" element={<Privacy />} />
                              {/* <Route path="/glossary" element={<Glossary />} /> */}
                              <Route path="/theme-analysis" element={<ThemeAnalysis />} />
                              <Route path="/shared/theme/:shareId" element={<SharedThemeAnalysis />} />
                              <Route path="/landing" element={<LandingPage />} />
                              <Route path="/affiliate" element={<Affiliate />} />
                              <Route path="/investment-heatmap" element={<InvestmentHeatmap />} />
                              {/* Redirects from old routes */}
                              <Route path="/portfolio" element={<Navigate to="/" replace />} />
                              <Route path="/companies" element={<Navigate to="/" replace />} />
                              <Route path="/companies/:id" element={<CompanyRedirect />} />
                              <Route path="/markets" element={<Navigate to="/" replace />} />
                              <Route path="/holdings" element={<Navigate to="/" replace />} />
                              
                              <Route path="/stock-swipe" element={<StockDiscovery />} />
                              <Route path="/management-fee" element={<ManagementFee />} />
                              <Route path="/sms-consent" element={<SmsConsent />} />
                              <Route path="/sim-trading" element={<SimTrading />} />
                              <Route path="/my-research" element={<MyResearch />} />
                              <Route path="/options-analyzer" element={<OptionsAnalyzerPage />} />
                              <Route path="/elite-onboarding" element={<EliteGuard><EliteOnboarding /></EliteGuard>} />
                              <Route path="/elite-dashboard" element={<EliteGuard><EliteDashboard /></EliteGuard>} />
                              <Route path="/elite-portfolio" element={<EliteGuard><ElitePortfolio /></EliteGuard>} />
                              <Route path="/unsubscribe" element={<Unsubscribe />} />
                              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </Layout>
                    <DevModeToggle />
                        <GlobalUploadProgress />
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
    </ThemeProvider>
  </ErrorBoundary>
  );
};

export default App;

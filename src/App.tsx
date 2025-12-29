import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import Index from "./pages/Index";
import Pipeline from "./pages/Pipeline";
import Models from "./pages/Models";
import Portfolio from "./pages/Portfolio";
import DataRoom from "./pages/DataRoom";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Contacts from "./pages/Contacts";
import MarketIntel from "./pages/MarketIntel";
import DealMatching from "./pages/DealMatching";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import CashFlowBuildupPage from "./pages/CashFlowBuildupPage";
import ModelViewerPage from "./pages/ModelViewerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/models" element={<Models />} />
              <Route path="/models/cash-flow-buildup" element={<CashFlowBuildupPage />} />
              <Route path="/models/view/:modelId" element={<ModelViewerPage />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/documents" element={<DataRoom />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/market-intel" element={<MarketIntel />} />
              <Route path="/deal-matching" element={<DealMatching />} />
              <Route path="/settings" element={<Settings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

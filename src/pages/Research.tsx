import { useState, useEffect } from 'react';
import { GlobalThemesWidget } from '@/components/research/GlobalThemesWidget';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Loader2, FileText, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTrendingTickers } from '@/hooks/useTrendingTickers';
import { useCategoryCounts, useETFCount } from '@/hooks/useCategoryCounts';
import { TickerCarousel } from '@/components/research/TickerCarousel';
import { MarketIntelligenceSection } from '@/components/research/MarketIntelligenceSection';
import { MarketThemesSection } from '@/components/research/MarketThemesSection';
import { EarningsCalendar } from '@/components/earnings';
import { AnimatedBackground } from '@/components/research/AnimatedBackground';
import { ResearchHero } from '@/components/research/ResearchHero';
import { FeatureShowcaseRow } from '@/components/research/FeatureShowcaseCard';
import { StickyEngagementBar } from '@/components/research/StickyEngagementBar';
import { ResearchCommunityPreview } from '@/components/research/ResearchCommunityPreview';
import { SocialProofSignals } from '@/components/research/SocialProofSignals';
import { OnboardingNudges } from '@/components/research/OnboardingNudges';
import { ResearchUnauthHero } from '@/components/research/ResearchUnauthHero';
import { ResearchMarketingSection } from '@/components/research/ResearchMarketingSection';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { AuthGateDialog } from '@/components/auth/AuthGateDialog';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

export default function ResearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth, showAuthDialog, closeAuthDialog } = useRequireAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentAssetSearches');
    return saved ? JSON.parse(saved) : [];
  });

  const { tickers: trendingTickers, isLoading: tickersLoading } = useTrendingTickers(12);
  const { data: categoryCounts = {} } = useCategoryCounts();
  const { data: etfCount = 0 } = useETFCount();

  // After sign-in, check for pending backtest or stock navigation
  useEffect(() => {
    if (!user) return;
    
    const pendingAction = sessionStorage.getItem('pending-auth-action');
    const pendingParams = sessionStorage.getItem('pending-backtest-params');
    
    if (pendingAction && pendingParams) {
      try {
        const action = JSON.parse(pendingAction);
        const params = JSON.parse(pendingParams);
        
        if (action.type === 'run-backtest' && Date.now() - action.timestamp < 300000) {
          sessionStorage.removeItem('pending-auth-action');
          sessionStorage.removeItem('pending-backtest-params');
          
          const ticker = params.ticker || 'SPY';
          navigate(`/stock/${ticker}`, { 
            state: { tab: 'backtest', autoRunStrategy: params } 
          });
          return;
        }
      } catch {
        sessionStorage.removeItem('pending-auth-action');
        sessionStorage.removeItem('pending-backtest-params');
      }
    }
    
    // Check for pending stock navigation
    const pendingStock = sessionStorage.getItem('pending-stock-navigation');
    if (pendingStock) {
      sessionStorage.removeItem('pending-stock-navigation');
      navigate(`/stock/${pendingStock}`);
    }
  }, [user, navigate]);

  const handleSearch = (ticker: string) => {
    const normalized = ticker.toUpperCase().trim();
    if (!normalized) return;
    
    const updated = [normalized, ...recentSearches.filter(t => t !== normalized)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentAssetSearches', JSON.stringify(updated));
    navigate(`/stock/${normalized}`);
  };

  // Ticker click — navigates directly; auth gate triggers on the stock page after 5s
  const handleTickerClick = (ticker: string) => {
    const normalized = ticker.toUpperCase().trim();
    if (!normalized) return;
    handleSearch(normalized);
  };

  // Navigation for buttons — let users through to see the page first
  const handleAuthNavigation = (path: string, state?: any) => {
    navigate(path, state ? { state } : undefined);
  };

  // Intercept clicks on interactive elements inside sections for unauth users
  const handleSectionClick = (e: React.MouseEvent, actionType: string) => {
    if (user) return; // Authenticated users pass through
    
    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], td, tr[class*="cursor"], [data-clickable], .cursor-pointer')) {
      e.preventDefault();
      e.stopPropagation();
      requireAuth(() => {}, actionType);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentAssetSearches');
  };

  const tickersWithQuotes = trendingTickers.map(t => ({
    symbol: t.symbol,
    name: t.name,
    price: t.price,
    changePercent: t.changePercent ?? undefined,
    marketCap: t.marketCap ?? undefined,
  }));

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Unauthenticated: massive hero-first experience */}
      {!user && <ResearchUnauthHero />}
      
      {/* Unauthenticated: features + stats section */}
      {!user && (
        <div id="research-features">
          <ResearchMarketingSection />
        </div>
      )}

      {/* Authenticated: standard hero */}
      {user && (
        <>
          <AnimatedBackground />
          <ResearchHero
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            recentSearches={recentSearches}
            onClearRecent={clearRecentSearches}
          />
        </>
      )}

      {/* Social Proof Signals */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 -mt-1 mb-2 sm:mb-4">
        <SocialProofSignals />
      </div>

      {/* Main Content */}
      <motion.div
        className="max-w-6xl mx-auto px-3 sm:px-6 pb-10 sm:pb-16 space-y-5 sm:space-y-12 relative"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Feature Showcase */}
        <motion.div variants={fadeUp}>
          <FeatureShowcaseRow />
        </motion.div>

        {/* Chat Room + Academy Previews */}
        <ResearchCommunityPreview />

        {/* Trending Tickers */}
        <motion.section className="space-y-2 sm:space-y-3" variants={fadeUp}>
          <div className="flex items-center justify-between opacity-80 sm:opacity-100">
            <div className="flex items-center gap-2">
              <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 border border-primary/20">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-xs sm:text-base font-mono font-semibold text-foreground uppercase tracking-wide">Trending Now</h2>
                <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground hidden sm:block">Click any card for full analysis</p>
              </div>
              {tickersLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <button
              onClick={() => handleAuthNavigation('/stock/AAPL')}
              className="hidden sm:inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg transition-all bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_16px_hsl(175_80%_45%/0.4)] hover:shadow-[0_0_24px_hsl(175_80%_45%/0.6)] text-[11px] px-5 py-2.5"
            >
              Explore stocks <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {tickersWithQuotes.length > 0 ? (
            <TickerCarousel 
              tickers={tickersWithQuotes} 
              onTickerClick={handleTickerClick} 
            />
          ) : tickersLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[100px] sm:h-[160px] bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-sm text-muted-foreground bg-card rounded-xl border border-border/60">
              No trending tickers available
            </div>
          )}
        </motion.section>

        {/* Major Market Themes — gated clicks */}
        <motion.div variants={fadeUp} onClick={(e) => handleSectionClick(e, 'view-theme')}>
          <MarketThemesSection />
        </motion.div>

        {/* Global Investment Themes Widget */}
        <motion.div variants={fadeUp}>
          <GlobalThemesWidget />
        </motion.div>

        {/* Market Intelligence — gated clicks */}
        <motion.div id="market-intelligence" variants={fadeUp} onClick={(e) => handleSectionClick(e, 'view-screener')}>
          <MarketIntelligenceSection />
        </motion.div>

        {/* Earnings Calendar — gated clicks */}
        <motion.section className="space-y-2 sm:space-y-3" variants={fadeUp}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 border border-primary/20">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-mono font-semibold text-foreground uppercase tracking-wide">Earnings Calendar</h2>
                <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground hidden sm:block">Upcoming earnings with AI predictions</p>
              </div>
            </div>
            <button
              onClick={() => handleAuthNavigation('/stock/NVDA')}
              className="hidden sm:inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg transition-all bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_16px_hsl(175_80%_45%/0.4)] hover:shadow-[0_0_24px_hsl(175_80%_45%/0.6)] text-[11px] px-5 py-2.5"
            >
              Get AI predictions <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div onClick={(e) => handleSectionClick(e, 'view-earnings')}>
            <EarningsCalendar />
          </div>
        </motion.section>

        {/* Bottom CTA Banner */}
        <motion.div variants={fadeUp} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 sm:p-10 text-center space-y-4">
          <h2 className="text-lg sm:text-2xl font-mono font-bold text-foreground">Ready to invest smarter?</h2>
          <p className="text-sm sm:text-base text-foreground/70 max-w-xl mx-auto">
            Access AI-powered analysis, no-code AI investing, and real-time market intelligence — all in one platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleAuthNavigation('/stock/AAPL', { tab: 'backtest' })}
              className="inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg transition-all bg-[hsl(175_80%_45%)] text-background hover:bg-[hsl(175_80%_50%)] shadow-[0_0_20px_hsl(175_80%_45%/0.4)] hover:shadow-[0_0_32px_hsl(175_80%_45%/0.6)] text-xs sm:text-sm px-6 py-3"
            >
              Start backtesting <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (!user) {
                  requireAuth(() => {}, 'screen-stocks');
                } else {
                  const el = document.getElementById('market-intelligence');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg transition-all border-2 border-[hsl(175_80%_45%/0.5)] text-[hsl(175_80%_45%)] hover:bg-[hsl(175_80%_45%/0.1)] hover:border-[hsl(175_80%_45%/0.8)] shadow-[0_0_12px_hsl(175_80%_45%/0.15)] hover:shadow-[0_0_20px_hsl(175_80%_45%/0.3)] text-xs sm:text-sm px-6 py-3"
            >
              Screen stocks <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Sticky Engagement Bar */}
      <StickyEngagementBar />

      {/* Onboarding Nudges */}
      <OnboardingNudges />

      {/* Auth Gate Dialog — shown with blur backdrop */}
      <AuthGateDialog
        open={showAuthDialog}
        onOpenChange={closeAuthDialog}
        title="Sign in to continue"
        description="Create a free account to access full stock analysis, AI predictions, and more."
      />
    </div>
  );
}

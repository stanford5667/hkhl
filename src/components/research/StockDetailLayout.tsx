import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Bookmark } from 'lucide-react';
import {
  Search, 
  LayoutDashboard, 
  FlaskConical, 
  BarChart3, 
  Newspaper, 
  FileText, 
  MessageCircle, 
  Beaker,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

export interface StockDetailTab {
  id: string;
  label: string;
  icon: React.ElementType;
  shortLabel?: string;
  color?: string; // Tailwind color class (e.g., 'blue', 'emerald', 'violet')
}

interface StockDetailLayoutProps {
  ticker: string;
  companyName?: string;
  exchange?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: StockDetailTab[];
  children: ReactNode;
  onBack?: () => void;
  price?: number;
  change?: number;
  changePercent?: number;
  onSaveToWatchlist?: () => void;
}

// Color classes for each tab category
const tabColorClasses: Record<string, { active: string; indicator: string }> = {
  blue: { active: 'bg-blue-600 text-white', indicator: 'bg-blue-500' },
  emerald: { active: 'bg-emerald-600 text-white', indicator: 'bg-emerald-500' },
  violet: { active: 'bg-violet-600 text-white', indicator: 'bg-violet-500' },
  amber: { active: 'bg-amber-600 text-white', indicator: 'bg-amber-500' },
  cyan: { active: 'bg-cyan-600 text-white', indicator: 'bg-cyan-500' },
  rose: { active: 'bg-rose-600 text-white', indicator: 'bg-rose-500' },
  primary: { active: 'bg-primary text-primary-foreground', indicator: 'bg-primary' },
};

export function StockDetailLayout({
  ticker,
  companyName,
  exchange,
  activeTab,
  onTabChange,
  tabs,
  children,
  onBack,
  price,
  change,
  changePercent,
  onSaveToWatchlist
}: StockDetailLayoutProps) {
  const isPositive = (change || 0) >= 0;
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = () => {
    const normalized = searchQuery.toUpperCase().trim();
    if (!normalized) return;
    navigate(`/stock/${normalized}`);
    setSearchQuery('');
  };

  return (
    <div className="flex h-[calc(100vh-56px-64px)] md:h-[calc(100vh-64px)]">
      {/* Left Sidebar - Icon tabs, sticky */}
      <div className="hidden md:flex flex-col w-16 lg:w-24 border-r-2 border-primary/20 bg-card shrink-0 shadow-lg">
        {/* Back button */}
        {onBack && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onBack}
                  className="w-full h-14 lg:h-16 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border-b border-border"
                >
                  <ArrowLeft className="h-5 w-5 lg:h-6 lg:w-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Go back</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Tab icons */}
        <nav className="flex-1 py-2">
          <TooltipProvider delayDuration={0}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colors = tabColorClasses[tab.color || 'primary'];
              
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "w-full h-16 lg:h-[72px] flex flex-col items-center justify-center gap-1.5 transition-all relative group",
                        isActive 
                          ? `${colors.active} shadow-md` 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 lg:h-6 lg:w-6 transition-transform",
                        isActive && "scale-110"
                      )} />
                      <span className={cn(
                        "text-[9px] lg:text-[10px] font-semibold leading-tight text-center px-1 uppercase tracking-wide",
                        isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {tab.shortLabel || tab.label.split(' ')[0]}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{tab.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Header with Search */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-2 p-2 md:p-3">
            {/* Mobile back button */}
            {onBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="md:hidden h-8 w-8 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Search Input - Always visible */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder={ticker}
                className={cn(
                  "pl-8 pr-16 h-8 md:h-9 text-sm bg-secondary/50 border-border",
                  isSearchFocused && "ring-1 ring-primary"
                )}
              />
              <Button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2 text-xs"
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {/* Save to Watchlist button */}
            {onSaveToWatchlist && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveToWatchlist}
                className="h-8 md:h-9 gap-1.5 shrink-0"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            )}

          </div>

          {/* Mobile tab bar */}
          <div className="md:hidden overflow-x-auto scrollbar-hide bg-card border-b-2 border-primary/20 shadow-md">
            <div className="flex min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const colors = tabColorClasses[tab.color || 'primary'];
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-4 py-3 text-[10px] font-semibold whitespace-nowrap transition-all relative uppercase tracking-wide",
                      isActive 
                        ? `${colors.active}` 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-transform",
                      isActive && "scale-110"
                    )} />
                    <span>{tab.shortLabel || tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Content (pad for mobile bottom nav + iOS safe area) */}
        <div className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Default tabs for public stock view (stocks with full financials)
export const DEFAULT_STOCK_TABS: StockDetailTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'blue' },
  { id: 'financials', label: 'Financials', icon: BarChart3, color: 'emerald' },
  { id: 'quant-lab', label: 'Quant Lab', icon: FlaskConical, shortLabel: 'Quant', color: 'violet' },
  { id: 'backtest', label: 'Backtest', icon: Beaker, color: 'primary' },
  { id: 'news', label: 'News', icon: Newspaper, color: 'amber' },
  { id: 'sec', label: 'SEC Filings', icon: FileText, shortLabel: 'SEC', color: 'cyan' },
  { id: 'analyst-social', label: 'Analyst & Social', icon: MessageCircle, shortLabel: 'Social', color: 'rose' },
];

// Re-export the tab type
export type { StockDetailTab as AssetTab };

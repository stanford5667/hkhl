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
      <div className="hidden md:flex flex-col w-16 lg:w-20 border-r border-border bg-card/50 shrink-0">
        {/* Back button */}
        {onBack && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onBack}
                  className="w-full h-12 lg:h-14 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border-b border-border"
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
        <nav className="flex-1 py-3">
          <TooltipProvider delayDuration={0}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "w-full h-12 lg:h-14 flex items-center justify-center transition-colors relative",
                        isActive 
                          ? "text-primary bg-primary/10" 
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
                      )}
                      <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
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
          <div className="md:hidden overflow-x-auto scrollbar-hide border-t border-border/50">
            <div className="flex min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
                      isActive 
                        ? "text-primary border-primary bg-primary/5" 
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.shortLabel || tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// Default tabs for public stock view
export const DEFAULT_STOCK_TABS: StockDetailTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'financials', label: 'Financials', icon: BarChart3 },
  { id: 'quant-lab', label: 'Quant Lab', icon: FlaskConical, shortLabel: 'Quant' },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'sec', label: 'SEC Filings', icon: FileText, shortLabel: 'SEC' },
  { id: 'analyst-social', label: 'Analyst & Social', icon: MessageCircle, shortLabel: 'Social' },
];

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Search, TrendingUp, ArrowLeft, X, FileText, 
  DollarSign, Newspaper, Users, ExternalLink, RefreshCw, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StockQuoteHeader } from '@/components/research/StockQuoteHeader';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'analysis', label: 'Analysis', icon: TrendingUp },
  { id: 'competitors', label: 'Competitors', icon: Users },
];

const POPULAR_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM'];

interface ResearchData {
  content: string;
  citations?: string[];
  generatedAt: string;
}

export default function ResearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tickerFromUrl = searchParams.get('ticker')?.toUpperCase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(tickerFromUrl || null);
  const [activeTab, setActiveTab] = useState('overview');
  const [research, setResearch] = useState<Record<string, ResearchData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentAssetSearches');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync URL param to state
  useEffect(() => {
    if (tickerFromUrl && tickerFromUrl !== selectedTicker) {
      setSelectedTicker(tickerFromUrl);
      setActiveTab('overview');
      setResearch({});
    }
  }, [tickerFromUrl]);

  const handleSearch = (ticker: string) => {
    const normalized = ticker.toUpperCase().trim();
    if (!normalized) return;
    
    setSelectedTicker(normalized);
    setActiveTab('overview');
    setResearch({});
    
    const updated = [normalized, ...recentSearches.filter(t => t !== normalized)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentAssetSearches', JSON.stringify(updated));
  };

  const fetchResearch = async (type: string) => {
    if (!selectedTicker || research[type]) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('research-asset', {
        body: { ticker: selectedTicker, researchType: type }
      });

      if (error) throw error;

      if (data?.success) {
        setResearch(prev => ({ ...prev, [type]: data.data }));
      } else {
        toast.error('Research failed');
      }
    } catch (e) {
      console.error('Research error:', e);
      toast.error('Failed to fetch research');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTicker) {
      fetchResearch(activeTab);
    }
  }, [activeTab, selectedTicker]);

  const currentResearch = research[activeTab];

  return (
    <div className="p-6 space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Asset Research</h1>
        <p className="text-slate-400">Research publicly traded stocks, ETFs, and more with AI</p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
            placeholder="Enter ticker symbol (e.g., AAPL, MSFT, GOOGL)"
            className="pl-12 pr-28 py-6 text-lg bg-slate-800 border-slate-700 text-white"
          />
          <Button
            onClick={() => handleSearch(searchQuery)}
            disabled={!searchQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-500"
          >
            Research
          </Button>
        </div>

        {!selectedTicker && recentSearches.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-500">Recent:</span>
            {recentSearches.slice(0, 5).map(ticker => (
              <Button
                key={ticker}
                variant="outline"
                size="sm"
                onClick={() => handleSearch(ticker)}
                className="text-slate-300 border-slate-700 hover:bg-slate-800"
              >
                {ticker}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Results or Popular */}
      {selectedTicker ? (
        <Card className="bg-slate-900 border-slate-800">
          {/* Stock Quote Header with Chart */}
          <StockQuoteHeader ticker={selectedTicker} />

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedTicker(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedTicker}</h2>
                <p className="text-sm text-slate-400">Powered by Perplexity AI</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedTicker(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-800">
            <div className="flex overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap",
                    activeTab === tab.id
                      ? "text-purple-400 border-b-2 border-purple-400"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[400px]">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Researching {selectedTicker}...
                </div>
                <Skeleton className="h-4 w-full bg-slate-800" />
                <Skeleton className="h-4 w-3/4 bg-slate-800" />
                <Skeleton className="h-4 w-5/6 bg-slate-800" />
                <Skeleton className="h-4 w-2/3 bg-slate-800" />
                <Skeleton className="h-4 w-4/5 bg-slate-800" />
              </div>
            ) : currentResearch ? (
              <div className="space-y-6">
                <div className="prose prose-invert max-w-none">
                  {currentResearch.content}
                </div>

                {currentResearch.citations && currentResearch.citations.length > 0 && (
                  <div className="border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Sources</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentResearch.citations.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {(() => {
                            try {
                              return new URL(url).hostname.replace('www.', '');
                            } catch {
                              return url;
                            }
                          })()}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Generated {new Date(currentResearch.generatedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-slate-400">Select a tab to load research</p>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResearch(prev => ({ ...prev, [activeTab]: undefined as unknown as ResearchData }));
                fetchResearch(activeTab);
              }}
              disabled={isLoading}
              className="text-slate-400 border-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </Card>
      ) : (
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-900 border-slate-800 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Popular Tickers</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TICKERS.map(ticker => (
                <Button
                  key={ticker}
                  variant="outline"
                  onClick={() => handleSearch(ticker)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  {ticker}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

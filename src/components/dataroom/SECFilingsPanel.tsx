import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Loader2,
  RefreshCw,
  Calendar,
  FileSearch,
  X,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SECFiling {
  type: string;
  title: string;
  filedAt: string;
  accessionNumber: string;
  url: string;
  description: string;
  content?: string;
  documentUrl?: string;
}

interface SECFilingsPanelProps {
  ticker: string | null;
  companyName?: string;
}

const filingTypeColors: Record<string, string> = {
  '10-K': 'bg-primary/20 text-primary border-primary/30',
  '10-Q': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  '8-K': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'DEF 14A': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Form 4': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export function SECFilingsPanel({ ticker, companyName }: SECFilingsPanelProps) {
  const [filings, setFilings] = useState<SECFiling[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFiling, setSelectedFiling] = useState<SECFiling | null>(null);
  const [source, setSource] = useState<string>('');

  const fetchFilings = async () => {
    if (!ticker) {
      toast.error('No ticker symbol available');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-sec-filings', {
        body: {
          ticker,
          filingTypes: ['10-K', '10-Q', '8-K', 'DEF 14A'],
          limit: 20,
        },
      });

      if (error) throw error;

      if (data.success) {
        setFilings(data.filings || []);
        setSource(data.source);
        toast.success(`Found ${data.count} SEC filings`);
      } else {
        throw new Error(data.error || 'Failed to fetch filings');
      }
    } catch (error) {
      console.error('Error fetching SEC filings:', error);
      toast.error('Failed to fetch SEC filings');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilingContent = async (filing: SECFiling) => {
    // If content already loaded, just display it
    if (filing.content) {
      setSelectedFiling(filing);
      return;
    }

    setLoadingContent(filing.accessionNumber);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-sec-filings', {
        body: {
          filingUrl: filing.url,
        },
      });

      if (error) throw error;

      if (data.success && data.content) {
        const updatedFiling = { ...filing, content: data.content };
        // Update the filing in the list
        setFilings(prev => prev.map(f => 
          f.accessionNumber === filing.accessionNumber ? updatedFiling : f
        ));
        setSelectedFiling(updatedFiling);
        toast.success('Filing content loaded');
      } else {
        throw new Error(data.error || 'Failed to load content');
      }
    } catch (error) {
      console.error('Error fetching filing content:', error);
      toast.error('Failed to load filing content. Make sure Firecrawl is connected.');
    } finally {
      setLoadingContent(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getFilingTypeColor = (type: string) => {
    return filingTypeColors[type] || 'bg-muted text-muted-foreground';
  };

  if (!ticker) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 text-center">
          <FileSearch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            SEC filings are only available for public companies with a ticker symbol.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Document viewer mode
  if (selectedFiling) {
    return (
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedFiling(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Badge
                variant="outline"
                className={getFilingTypeColor(selectedFiling.type)}
              >
                {selectedFiling.type}
              </Badge>
              <span className="font-medium text-sm truncate max-w-[300px]">
                {selectedFiling.title}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedFiling(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 ml-12">
            <Calendar className="h-3 w-3" />
            {formatDate(selectedFiling.filedAt)}
            {selectedFiling.accessionNumber && (
              <span className="font-mono">#{selectedFiling.accessionNumber}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-6">
              {selectedFiling.content ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {selectedFiling.content.split('\n').map((line, i) => {
                      // Basic markdown-like rendering
                      if (line.startsWith('# ')) {
                        return <h1 key={i} className="text-2xl font-bold mt-6 mb-4 text-foreground">{line.slice(2)}</h1>;
                      }
                      if (line.startsWith('## ')) {
                        return <h2 key={i} className="text-xl font-semibold mt-5 mb-3 text-foreground">{line.slice(3)}</h2>;
                      }
                      if (line.startsWith('### ')) {
                        return <h3 key={i} className="text-lg font-medium mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
                      }
                      if (line.startsWith('- ') || line.startsWith('* ')) {
                        return <li key={i} className="ml-4 text-muted-foreground">{line.slice(2)}</li>;
                      }
                      if (line.match(/^\d+\.\s/)) {
                        return <li key={i} className="ml-4 list-decimal text-muted-foreground">{line.replace(/^\d+\.\s/, '')}</li>;
                      }
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={i} className="font-semibold my-2 text-foreground">{line.slice(2, -2)}</p>;
                      }
                      if (line.trim() === '') {
                        return <br key={i} />;
                      }
                      return <p key={i} className="my-1 text-muted-foreground">{line}</p>;
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Loading content...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  // List view
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            SEC Filings
            {ticker && (
              <Badge variant="outline" className="ml-2">
                {ticker}
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={fetchFilings}
            disabled={loading}
            size="sm"
            variant={hasSearched ? 'outline' : 'default'}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : hasSearched ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Fetch SEC Filings
              </>
            )}
          </Button>
        </div>
        {source && (
          <p className="text-xs text-muted-foreground mt-1">
            Source: {source === 'sec_edgar' ? 'SEC EDGAR' : source === 'firecrawl' ? 'Firecrawl' : 'Demo Data'}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasSearched ? (
          <div className="text-center py-8">
            <FileSearch className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-2">
              Click "Fetch SEC Filings" to retrieve filings from SEC EDGAR
            </p>
            <p className="text-xs text-muted-foreground">
              Includes 10-K, 10-Q, 8-K, and Proxy Statements
            </p>
          </div>
        ) : filings.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No SEC filings found for {ticker}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filings.map((filing) => (
              <div
                key={filing.accessionNumber || filing.title}
                className="border border-border rounded-lg hover:border-primary/50 transition-colors p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={getFilingTypeColor(filing.type)}
                  >
                    {filing.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{filing.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(filing.filedAt)}
                      {filing.accessionNumber && (
                        <span className="font-mono">#{filing.accessionNumber}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => fetchFilingContent(filing)}
                    disabled={loadingContent === filing.accessionNumber}
                  >
                    {loadingContent === filing.accessionNumber ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {filing.content ? 'View' : 'Load & View'}
                  </Button>
                </div>
                {filing.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {filing.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

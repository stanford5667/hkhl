import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Calendar,
  FileSearch,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SECFiling {
  type: string;
  title: string;
  filedAt: string;
  accessionNumber: string;
  url: string;
  description: string;
  content?: string;
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
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFilings, setSelectedFilings] = useState<Set<string>>(new Set());
  const [expandedFilings, setExpandedFilings] = useState<Set<string>>(new Set());
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

  const toggleFiling = (accessionNumber: string) => {
    const newSelected = new Set(selectedFilings);
    if (newSelected.has(accessionNumber)) {
      newSelected.delete(accessionNumber);
    } else {
      newSelected.add(accessionNumber);
    }
    setSelectedFilings(newSelected);
  };

  const toggleExpand = (accessionNumber: string) => {
    const newExpanded = new Set(expandedFilings);
    if (newExpanded.has(accessionNumber)) {
      newExpanded.delete(accessionNumber);
    } else {
      newExpanded.add(accessionNumber);
    }
    setExpandedFilings(newExpanded);
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
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {filings.map((filing) => (
              <Collapsible
                key={filing.accessionNumber || filing.title}
                open={expandedFilings.has(filing.accessionNumber)}
                onOpenChange={() => toggleExpand(filing.accessionNumber)}
              >
                <div className="border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3 p-3">
                    <Checkbox
                      checked={selectedFilings.has(filing.accessionNumber)}
                      onCheckedChange={() => toggleFiling(filing.accessionNumber)}
                    />
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
                    <div className="flex items-center gap-1">
                      {filing.url && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(filing.url, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <CollapsibleTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7">
                          {expandedFilings.has(filing.accessionNumber) ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-border mt-0">
                      <div className="pt-3 space-y-2">
                        {filing.description && (
                          <p className="text-sm text-muted-foreground">
                            {filing.description}
                          </p>
                        )}
                        {filing.content && (
                          <div className="bg-muted/50 rounded p-3 max-h-48 overflow-y-auto">
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                              {filing.content.slice(0, 1000)}
                              {filing.content.length > 1000 && '...'}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(filing.url, '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            View on SEC
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {selectedFilings.size > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {selectedFilings.size} filing(s) selected
            </span>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Selected
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

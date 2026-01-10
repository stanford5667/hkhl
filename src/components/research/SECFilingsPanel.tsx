import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, RefreshCw, ExternalLink } from 'lucide-react';
import { useSecFilings, useRefreshResearch } from '@/hooks/useCompanyResearch';
import { toast } from 'sonner';

interface SECFilingsPanelProps {
  ticker: string;
  companyName?: string;
}

export function SECFilingsPanel({ ticker, companyName }: SECFilingsPanelProps) {
  const { data: secData, isLoading: secLoading } = useSecFilings(ticker, 10, true);
  const refreshMutation = useRefreshResearch();
  
  const handleRefresh = () => {
    refreshMutation.mutate({ ticker, scrapeType: 'sec_filings' });
    toast.success('Refreshing SEC filings...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">SEC Filings</h2>
          {companyName && <span className="text-muted-foreground">for {companyName}</span>}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshMutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {secLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4">
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {secData?.data?.filings?.map((filing, idx) => (
            <Card key={idx} className="glass-card hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">{filing.type}</Badge>
                      <span className="font-medium">{filing.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Filed: {new Date(filing.filedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={filing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!secData?.data?.filings || secData.data.filings.length === 0) && (
            <Card className="glass-card">
              <CardContent className="p-6 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No SEC filings found for {ticker}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { isFinnhubConfigured } from '@/services/finnhubService';

const DISMISSED_KEY = 'finnhub-banner-dismissed';

export function FinnhubApiBanner() {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    setIsConfigured(isFinnhubConfigured());
  }, []);

  if (isConfigured || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  return (
    <Alert className="border-amber-500/50 bg-amber-500/10 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <span className="font-medium text-amber-200">Live market data unavailable.</span>{' '}
          <span className="text-muted-foreground">
            Add <code className="bg-muted px-1 py-0.5 rounded text-xs">VITE_FINNHUB_API_KEY</code> to your .env file for real-time quotes.
            Showing sample data instead.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
            asChild
          >
            <a
              href="https://finnhub.io/register"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Free API Key
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

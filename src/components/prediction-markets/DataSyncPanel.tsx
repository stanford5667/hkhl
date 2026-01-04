import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, Wallet, TrendingUp, Newspaper, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncStatus {
  isRunning: boolean;
  lastRun?: string;
  result?: {
    success: boolean;
    message?: string;
    count?: number;
  };
}

export function DataSyncPanel() {
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({
    polymarket: { isRunning: false },
    kalshi: { isRunning: false },
    arbitrage: { isRunning: false },
    whales: { isRunning: false },
    news: { isRunning: false },
  });

  const runSync = async (syncType: string, functionName: string) => {
    setSyncStatus(prev => ({
      ...prev,
      [syncType]: { isRunning: true }
    }));

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { mode: 'full' }
      });

      if (error) throw error;

      setSyncStatus(prev => ({
        ...prev,
        [syncType]: {
          isRunning: false,
          lastRun: new Date().toISOString(),
          result: {
            success: data.success,
            message: data.error || data.message,
            count: data.markets_synced || data.opportunities_found || data.transactions_found || data.articles_inserted
          }
        }
      }));

      if (data.success) {
        toast.success(`${syncType} sync complete`, {
          description: `Synced ${data.markets_synced || data.opportunities_found || data.transactions_found || data.articles_inserted || 0} items`
        });
      } else {
        toast.warning(`${syncType} sync completed with issues`, {
          description: data.message || data.error
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setSyncStatus(prev => ({
        ...prev,
        [syncType]: {
          isRunning: false,
          lastRun: new Date().toISOString(),
          result: { success: false, message: errMsg }
        }
      }));
      toast.error(`${syncType} sync failed`, { description: errMsg });
    }
  };

  const runAllSyncs = async () => {
    await Promise.all([
      runSync('polymarket', 'sync-polymarket'),
      runSync('news', 'ingest-google-news-rss'),
    ]);
    // Run arbitrage after markets are synced
    setTimeout(() => runSync('arbitrage', 'scan-arbitrage'), 2000);
    // Run whale tracking
    runSync('whales', 'track-whales');
  };

  const syncItems = [
    {
      id: 'polymarket',
      name: 'Polymarket',
      description: 'Sync prediction markets from Polymarket API',
      icon: Database,
      function: 'sync-polymarket',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      id: 'kalshi',
      name: 'Kalshi',
      description: 'Sync prediction markets from Kalshi API (requires API keys)',
      icon: Database,
      function: 'sync-kalshi',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      requiresKeys: ['KALSHI_API_KEY', 'KALSHI_API_SECRET']
    },
    {
      id: 'arbitrage',
      name: 'Arbitrage Scanner',
      description: 'Scan for arbitrage opportunities across markets',
      icon: TrendingUp,
      function: 'scan-arbitrage',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      id: 'whales',
      name: 'Whale Tracker',
      description: 'Track whale transactions on Polymarket (requires RPC)',
      icon: Wallet,
      function: 'track-whales',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      requiresKeys: ['ALCHEMY_API_KEY or QUICKNODE_API_KEY']
    },
    {
      id: 'news',
      name: 'Google News RSS',
      description: 'Ingest news from Google News RSS feeds (no API key required)',
      icon: Newspaper,
      function: 'ingest-google-news-rss',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Sync Center</h2>
          <p className="text-muted-foreground">
            Sync market data from external sources to populate your prediction market intelligence
          </p>
        </div>
        <Button onClick={runAllSyncs} size="lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync All Sources
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {syncItems.map(item => {
          const status = syncStatus[item.id];
          const Icon = item.icon;
          
          return (
            <Card key={item.id} className="relative overflow-hidden">
              {status.isRunning && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Syncing...</span>
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  {status.result && (
                    <Badge variant={status.result.success ? 'default' : 'destructive'}>
                      {status.result.success ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {status.result.success ? 'Success' : 'Failed'}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                {item.requiresKeys && (
                  <div className="mb-3 p-2 rounded-md bg-muted text-xs text-muted-foreground">
                    <span className="font-medium">Requires: </span>
                    {item.requiresKeys.join(', ')}
                  </div>
                )}
                
                {status.lastRun && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" />
                    Last run: {new Date(status.lastRun).toLocaleTimeString()}
                    {status.result?.count !== undefined && (
                      <span className="ml-2">• {status.result.count} items</span>
                    )}
                  </div>
                )}
                
                {status.result?.message && !status.result.success && (
                  <p className="text-xs text-destructive mb-3 truncate" title={status.result.message}>
                    {status.result.message}
                  </p>
                )}
                
                <Button 
                  onClick={() => runSync(item.id, item.function)}
                  disabled={status.isRunning}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${status.isRunning ? 'animate-spin' : ''}`} />
                  {status.isRunning ? 'Syncing...' : 'Run Sync'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-emerald-500 mb-2">✅ Ready to Use (No API Keys)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Polymarket</strong> - Public API, works immediately</li>
                <li>• <strong>Google News RSS</strong> - Free RSS feeds, no auth needed</li>
                <li>• <strong>Arbitrage Scanner</strong> - Uses synced market data</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-orange-500 mb-2">⚠️ Requires Configuration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Kalshi</strong> - Add KALSHI_API_KEY and KALSHI_API_SECRET</li>
                <li>• <strong>Whale Tracker</strong> - Add ALCHEMY_API_KEY or QUICKNODE_API_KEY</li>
                <li>• <strong>NewsAPI/CryptoPanic</strong> - Add respective API keys</li>
              </ul>
            </div>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Recommended Sync Schedule</h4>
            <p className="text-sm text-muted-foreground">
              For production use, set up cron jobs to run these syncs automatically:
              <br />• <strong>Markets (Polymarket/Kalshi):</strong> Every 5 minutes
              <br />• <strong>Arbitrage Scanner:</strong> Every minute
              <br />• <strong>Whale Tracker:</strong> Every 2 minutes
              <br />• <strong>News:</strong> Every 15 minutes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

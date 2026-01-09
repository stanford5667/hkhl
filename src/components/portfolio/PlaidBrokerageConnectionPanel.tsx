// Production Plaid Brokerage Connection Panel
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Building2,
  Check,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Shield,
  Unlink,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BrokerageConnection {
  id: string;
  brokerage_name: string;
  account_name: string | null;
  account_mask: string | null;
  connection_status: string;
  last_sync_at: string | null;
  sync_error: string | null;
  metadata: Record<string, unknown> | null;
}

interface PlaidBrokerageConnectionPanelProps {
  portfolioId?: string | null;
  onSyncComplete?: () => void;
  onPositionsChange?: () => void;
}

export function PlaidBrokerageConnectionPanel({
  portfolioId,
  onSyncComplete,
  onPositionsChange,
}: PlaidBrokerageConnectionPanelProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BrokerageConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [plaidConfigured, setPlaidConfigured] = useState<boolean | null>(null);

  // Fetch existing connections
  useEffect(() => {
    if (!user?.id) return;

    const fetchConnections = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('brokerage_connections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setConnections((data as BrokerageConnection[]) || []);
      } catch (err) {
        console.error('Error fetching connections:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnections();
  }, [user?.id]);

  // Check if Plaid is configured
  useEffect(() => {
    const checkPlaidConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('brokerage-sync', {
          body: { action: 'check-config' },
        });
        
        setPlaidConfigured(!error && data?.configured);
      } catch {
        setPlaidConfigured(false);
      }
    };

    checkPlaidConfig();
  }, []);

  // Create Plaid Link token and open Link
  const handleConnectBrokerage = async () => {
    if (!user?.id) return;

    setIsConnecting(true);
    try {
      // Get link token from edge function
      const { data, error } = await supabase.functions.invoke('brokerage-sync', {
        body: {
          action: 'create-link-token',
          userId: user.id,
        },
      });

      if (error) throw error;

      if (!data?.link_token) {
        throw new Error('Failed to create Plaid link token');
      }

      // In production, you'd use Plaid Link here
      // For now, show instructions
      toast.info('Plaid Link integration requires the Plaid Link SDK. See console for details.');
      console.log('Link Token:', data.link_token);
      console.log('To complete Plaid integration:');
      console.log('1. Add react-plaid-link package');
      console.log('2. Use PlaidLink component with this token');
      console.log('3. Exchange public_token for access_token via brokerage-sync function');
    } catch (err) {
      console.error('Error creating link:', err);
      toast.error('Failed to initialize brokerage connection');
    } finally {
      setIsConnecting(false);
    }
  };

  // Sync positions from a connection
  const handleSync = async (connectionId: string) => {
    setSyncingId(connectionId);
    try {
      const { data, error } = await supabase.functions.invoke('brokerage-sync', {
        body: {
          action: 'sync-positions',
          connectionId,
          portfolioId,
        },
      });

      if (error) throw error;

      toast.success(`Synced ${data?.positionCount || 0} positions`);
      onSyncComplete?.();
      onPositionsChange?.();

      // Update connection in local state
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId
            ? { ...c, last_sync_at: new Date().toISOString(), sync_error: null }
            : c
        )
      );
    } catch (err) {
      console.error('Error syncing:', err);
      toast.error('Failed to sync positions');
    } finally {
      setSyncingId(null);
    }
  };

  // Disconnect a brokerage
  const handleDisconnect = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('brokerage_connections')
        .update({ connection_status: 'disconnected' })
        .eq('id', connectionId);

      if (error) throw error;

      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId ? { ...c, connection_status: 'disconnected' } : c
        )
      );
      toast.success('Brokerage disconnected');
    } catch (err) {
      console.error('Error disconnecting:', err);
      toast.error('Failed to disconnect');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeConnections = connections.filter((c) => c.connection_status === 'connected');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Brokerage Connections
            </CardTitle>
            <CardDescription className="mt-1">
              Connect your brokerage accounts to automatically import positions
            </CardDescription>
          </div>
          <Badge variant={plaidConfigured ? 'default' : 'secondary'} className="gap-1">
            <Shield className="h-3 w-3" />
            {plaidConfigured ? 'Plaid Ready' : 'Setup Required'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connect Button */}
        {plaidConfigured === false ? (
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-dashed">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Plaid Integration Not Configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                To enable brokerage connections, add your Plaid credentials in Supabase Edge Function secrets:
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• PLAID_CLIENT_ID</li>
                <li>• PLAID_SECRET</li>
                <li>• PLAID_ENV (sandbox/development/production)</li>
              </ul>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleConnectBrokerage}
            disabled={isConnecting}
            className="w-full gap-2"
            variant="outline"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Connect Brokerage Account
          </Button>
        )}

        {/* Active Connections */}
        {activeConnections.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Connected Accounts</h4>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {activeConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {connection.brokerage_name}
                          {connection.account_mask && (
                            <span className="text-muted-foreground ml-1">
                              ••{connection.account_mask}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {connection.last_sync_at
                            ? `Last synced: ${new Date(connection.last_sync_at).toLocaleString()}`
                            : 'Never synced'}
                        </p>
                        {connection.sync_error && (
                          <p className="text-xs text-destructive mt-1">{connection.sync_error}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSync(connection.id)}
                        disabled={syncingId === connection.id}
                      >
                        {syncingId === connection.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDisconnect(connection.id)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {activeConnections.length === 0 && plaidConfigured && (
          <div className="text-center py-6 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No brokerage accounts connected</p>
            <p className="text-xs mt-1">
              Connect your brokerage to automatically import positions
            </p>
          </div>
        )}

        {/* Security Note */}
        <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
          <Shield className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Connections are secured via Plaid, a trusted financial data platform used by major banks.
            We never store your login credentials.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

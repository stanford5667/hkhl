// Brokerage Connection Panel
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Link2, 
  Unlink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { SUPPORTED_BROKERAGES, type BrokerageConnection } from '@/types/positions';
import { useBrokerageConnections } from '@/hooks/usePositions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface BrokerageConnectionPanelProps {
  onSyncComplete?: () => void;
}

export function BrokerageConnectionPanel({ onSyncComplete }: BrokerageConnectionPanelProps) {
  const { connections, isLoading, addConnection, deleteConnection, refetch } = useBrokerageConnections();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnect = async (brokerageId: string) => {
    const brokerage = SUPPORTED_BROKERAGES.find(b => b.id === brokerageId);
    if (!brokerage) return;

    setConnectingId(brokerageId);
    
    try {
      // In production, this would initiate Plaid/SnapTrade OAuth flow
      await addConnection(brokerage.name);
      toast.success(`Connected to ${brokerage.name}`, {
        description: 'Account linked successfully. Positions will sync shortly.',
      });
      onSyncComplete?.();
    } catch (err) {
      toast.error('Connection failed', {
        description: 'Unable to link brokerage account. Please try again.',
      });
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (connection: BrokerageConnection) => {
    try {
      await deleteConnection(connection.id);
      toast.success('Account disconnected', {
        description: `${connection.brokerage_name} has been unlinked.`,
      });
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Unlink className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  // Get brokerages that aren't connected yet
  const availableBrokerages = SUPPORTED_BROKERAGES.filter(
    b => !connections.find(c => c.brokerage_name === b.name)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Accounts */}
      {connections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Connected Accounts</h4>
          {connections.map((connection) => (
            <Card key={connection.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(connection.connection_status)}
                  <div>
                    <p className="font-medium">{connection.brokerage_name}</p>
                    {connection.account_name && (
                      <p className="text-sm text-muted-foreground">
                        {connection.account_name}
                        {connection.account_mask && ` (...${connection.account_mask})`}
                      </p>
                    )}
                    {connection.last_sync_at && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {format(new Date(connection.last_sync_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(connection.connection_status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetch()}
                    className="h-8 w-8"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDisconnect(connection)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {connection.sync_error && (
                <p className="mt-2 text-sm text-rose-400 bg-rose-500/10 p-2 rounded">
                  {connection.sync_error}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Available Brokerages */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          {connections.length > 0 ? 'Add Another Account' : 'Connect Your Brokerage'}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {availableBrokerages.map((brokerage) => (
            <button
              key={brokerage.id}
              onClick={() => handleConnect(brokerage.id)}
              disabled={connectingId === brokerage.id}
              className={cn(
                "p-4 rounded-lg border border-border hover:border-primary/50 transition-all",
                "flex items-center gap-3 text-left hover:bg-muted/50",
                connectingId === brokerage.id && "opacity-50 cursor-wait"
              )}
            >
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xl", brokerage.color)}>
                {connectingId === brokerage.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  brokerage.icon
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{brokerage.name}</p>
                <p className="text-xs text-muted-foreground">Click to connect</p>
              </div>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <ExternalLink className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Secure Connection</p>
            <p className="text-xs text-muted-foreground">
              We use industry-standard encryption and never store your brokerage credentials. 
              Connections are read-only and cannot execute trades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

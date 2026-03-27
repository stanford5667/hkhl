import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PendingOrder {
  id: string;
  ticker: string;
  order_type: string;
  side: string;
  quantity: number;
  limit_price: number | null;
  stop_price: number | null;
  time_in_force: string;
  status: string;
  instrument_type: string;
  created_at: string;
}

interface Props {
  orders: PendingOrder[];
  onRefresh: () => void;
}

export function PendingOrdersTab({ orders, onRefresh }: Props) {
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (orderId: string) => {
    setCancelling(orderId);
    const { error } = await supabase
      .from('sim_pending_orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to cancel order');
    } else {
      toast.success('Order cancelled');
      onRefresh();
    }
    setCancelling(null);
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');

  if (pendingOrders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No pending orders</p>
          <p className="text-xs text-muted-foreground mt-1">Place a limit or stop order to see it here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {pendingOrders.map(order => {
        const price = order.order_type === 'limit' ? order.limit_price : order.stop_price;
        return (
          <Card key={order.id}>
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3">
                <Badge variant={order.side === 'buy' ? 'default' : 'destructive'} className="uppercase text-xs">
                  {order.side}
                </Badge>
                <div>
                  <span className="font-medium text-foreground">{order.ticker}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {order.quantity} {order.instrument_type === 'option' ? 'contracts' : 'shares'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-mono">
                    {order.order_type === 'limit' ? 'Limit' : 'Stop'} @ ${price?.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase">{order.time_in_force}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-8 w-8"
                  onClick={() => handleCancel(order.id)}
                  disabled={cancelling === order.id}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

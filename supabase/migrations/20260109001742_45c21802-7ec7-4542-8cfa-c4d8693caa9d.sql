-- Brokerage Connections table
CREATE TABLE public.brokerage_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.saved_portfolios(id) ON DELETE SET NULL,
  brokerage_name TEXT NOT NULL,
  account_name TEXT,
  account_mask TEXT,
  access_token TEXT,
  connection_status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Synced Positions table
CREATE TABLE public.synced_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.saved_portfolios(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.brokerage_connections(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  name TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  cost_basis NUMERIC,
  cost_per_share NUMERIC,
  current_price NUMERIC,
  current_value NUMERIC,
  unrealized_gain NUMERIC,
  unrealized_gain_percent NUMERIC,
  asset_type TEXT DEFAULT 'stock',
  source TEXT NOT NULL DEFAULT 'manual',
  last_price_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brokerage_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_positions ENABLE ROW LEVEL SECURITY;

-- RLS policies for brokerage_connections
CREATE POLICY "Users can view their own brokerage connections"
ON public.brokerage_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own brokerage connections"
ON public.brokerage_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brokerage connections"
ON public.brokerage_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brokerage connections"
ON public.brokerage_connections FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for synced_positions
CREATE POLICY "Users can view their own positions"
ON public.synced_positions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own positions"
ON public.synced_positions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions"
ON public.synced_positions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own positions"
ON public.synced_positions FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_brokerage_connections_user ON public.brokerage_connections(user_id);
CREATE INDEX idx_synced_positions_user ON public.synced_positions(user_id);
CREATE INDEX idx_synced_positions_portfolio ON public.synced_positions(portfolio_id);
CREATE INDEX idx_synced_positions_symbol ON public.synced_positions(symbol);

-- Updated at trigger
CREATE TRIGGER update_brokerage_connections_updated_at
BEFORE UPDATE ON public.brokerage_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_synced_positions_updated_at
BEFORE UPDATE ON public.synced_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
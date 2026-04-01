
-- Smart Money Insider Trades (cached from SEC EDGAR)
CREATE TABLE public.smart_money_insider_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  company_name TEXT,
  insider_name TEXT NOT NULL,
  insider_title TEXT,
  transaction_type VARCHAR(20) NOT NULL, -- 'buy', 'sell', 'gift', 'exercise'
  shares BIGINT,
  price_per_share NUMERIC(12,4),
  total_value NUMERIC(16,2),
  shares_owned_after BIGINT,
  filing_date DATE NOT NULL,
  transaction_date DATE,
  sec_filing_url TEXT,
  is_significant BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smi_ticker ON public.smart_money_insider_trades(ticker);
CREATE INDEX idx_smi_filing_date ON public.smart_money_insider_trades(filing_date DESC);
CREATE INDEX idx_smi_insider ON public.smart_money_insider_trades(insider_name);
CREATE INDEX idx_smi_type ON public.smart_money_insider_trades(transaction_type);

ALTER TABLE public.smart_money_insider_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read insider trades"
  ON public.smart_money_insider_trades FOR SELECT TO authenticated USING (true);

-- Smart Money Institutional Holdings (13F)
CREATE TABLE public.smart_money_institutional_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_name TEXT NOT NULL,
  fund_cik VARCHAR(20),
  ticker VARCHAR(20) NOT NULL,
  company_name TEXT,
  shares BIGINT,
  value NUMERIC(16,2),
  change_shares BIGINT DEFAULT 0,
  change_pct NUMERIC(8,2) DEFAULT 0,
  weight_pct NUMERIC(8,4),
  filing_date DATE NOT NULL,
  report_date DATE,
  filing_type VARCHAR(10) DEFAULT '13F',
  sec_filing_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smih_ticker ON public.smart_money_institutional_holdings(ticker);
CREATE INDEX idx_smih_fund ON public.smart_money_institutional_holdings(fund_name);
CREATE INDEX idx_smih_filing_date ON public.smart_money_institutional_holdings(filing_date DESC);

ALTER TABLE public.smart_money_institutional_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read institutional holdings"
  ON public.smart_money_institutional_holdings FOR SELECT TO authenticated USING (true);

-- Smart Money Options Flow
CREATE TABLE public.smart_money_options_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  contract_type VARCHAR(10) NOT NULL, -- 'call', 'put'
  strike NUMERIC(12,2) NOT NULL,
  expiration DATE NOT NULL,
  premium NUMERIC(16,2),
  volume BIGINT,
  open_interest BIGINT,
  implied_volatility NUMERIC(8,4),
  volume_oi_ratio NUMERIC(8,2),
  sentiment VARCHAR(20), -- 'bullish', 'bearish', 'neutral'
  unusual_score NUMERIC(5,2),
  trade_time TIMESTAMPTZ,
  underlying_price NUMERIC(12,2),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smof_ticker ON public.smart_money_options_flow(ticker);
CREATE INDEX idx_smof_time ON public.smart_money_options_flow(trade_time DESC);
CREATE INDEX idx_smof_sentiment ON public.smart_money_options_flow(sentiment);

ALTER TABLE public.smart_money_options_flow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read options flow"
  ON public.smart_money_options_flow FOR SELECT TO authenticated USING (true);

-- Smart Money Block Trades
CREATE TABLE public.smart_money_block_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  shares BIGINT NOT NULL,
  price NUMERIC(12,4) NOT NULL,
  total_value NUMERIC(16,2) NOT NULL,
  trade_time TIMESTAMPTZ NOT NULL,
  exchange VARCHAR(20),
  side VARCHAR(10), -- 'buy', 'sell', 'unknown'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smbt_ticker ON public.smart_money_block_trades(ticker);
CREATE INDEX idx_smbt_time ON public.smart_money_block_trades(trade_time DESC);
CREATE INDEX idx_smbt_value ON public.smart_money_block_trades(total_value DESC);

ALTER TABLE public.smart_money_block_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read block trades"
  ON public.smart_money_block_trades FOR SELECT TO authenticated USING (true);

-- User Watchlists
CREATE TABLE public.smart_money_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smw_user ON public.smart_money_watchlists(user_id);

ALTER TABLE public.smart_money_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own watchlists" ON public.smart_money_watchlists
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Watchlist Items
CREATE TABLE public.smart_money_watchlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  watchlist_id UUID NOT NULL REFERENCES public.smart_money_watchlists(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- 'ticker', 'insider', 'fund'
  item_value TEXT NOT NULL, -- ticker symbol, insider name, or fund name
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smwi_watchlist ON public.smart_money_watchlist_items(watchlist_id);

ALTER TABLE public.smart_money_watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own watchlist items" ON public.smart_money_watchlist_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.smart_money_watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.smart_money_watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid())
  );

-- User Alerts
CREATE TABLE public.smart_money_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type VARCHAR(30) NOT NULL, -- 'insider_buy', 'insider_sell', 'options_unusual', 'block_trade'
  conditions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  notification_method VARCHAR(20) DEFAULT 'email', -- 'email', 'push', 'both'
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sma_user ON public.smart_money_alerts(user_id);
CREATE INDEX idx_sma_active ON public.smart_money_alerts(is_active) WHERE is_active = true;

ALTER TABLE public.smart_money_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own alerts" ON public.smart_money_alerts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alert History
CREATE TABLE public.smart_money_alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.smart_money_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_data JSONB,
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ
);

CREATE INDEX idx_smah_user ON public.smart_money_alert_history(user_id);
CREATE INDEX idx_smah_alert ON public.smart_money_alert_history(alert_id);

ALTER TABLE public.smart_money_alert_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own alert history" ON public.smart_money_alert_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Updated_at triggers
CREATE TRIGGER update_smart_money_insider_trades_updated_at
  BEFORE UPDATE ON public.smart_money_insider_trades
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_smart_money_institutional_holdings_updated_at
  BEFORE UPDATE ON public.smart_money_institutional_holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_smart_money_watchlists_updated_at
  BEFORE UPDATE ON public.smart_money_watchlists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_smart_money_alerts_updated_at
  BEFORE UPDATE ON public.smart_money_alerts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

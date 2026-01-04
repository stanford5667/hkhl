-- =====================================================
-- PREDICTION MARKET INTELLIGENCE PLATFORM SCHEMA
-- =====================================================

-- 1. PREDICTION_MARKETS - Registry of all tracked markets
CREATE TABLE public.prediction_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('polymarket', 'kalshi', 'predictit', 'metaculus')),
  platform_market_id VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('politics', 'crypto', 'sports', 'economics', 'science', 'entertainment', 'climate', 'tech')),
  subcategory VARCHAR(100),
  resolution_source TEXT,
  resolution_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled', 'paused')),
  is_binary BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  UNIQUE(platform, platform_market_id)
);

-- 2. MARKET_OUTCOMES - Individual outcomes within a market
CREATE TABLE public.market_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  platform_outcome_id VARCHAR(255),
  title TEXT NOT NULL,
  current_price DECIMAL(8,4) CHECK (current_price >= 0 AND current_price <= 1),
  volume_total DECIMAL(18,2) DEFAULT 0,
  volume_24h DECIMAL(18,2) DEFAULT 0,
  open_interest DECIMAL(18,2) DEFAULT 0,
  last_trade_price DECIMAL(8,4),
  price_change_24h DECIMAL(8,4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. MARKET_PRICE_HISTORY - Time series price data
CREATE TABLE public.market_price_history (
  id BIGSERIAL PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES public.market_outcomes(id) ON DELETE CASCADE,
  price DECIMAL(8,4) NOT NULL CHECK (price >= 0 AND price <= 1),
  volume DECIMAL(18,2) DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ARBITRAGE_OPPORTUNITIES - Detected arbitrage signals
CREATE TABLE public.arbitrage_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('combinatorial', 'cross_platform', 'temporal')),
  markets UUID[] NOT NULL,
  platforms VARCHAR(50)[] NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  profit_potential DECIMAL(8,4) NOT NULL,
  confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'executed', 'expired', 'invalid')),
  details JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ,
  actual_profit DECIMAL(8,4)
);

-- 5. REAL_WORLD_EVENTS - External events that impact markets
CREATE TABLE public.real_world_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  source VARCHAR(255),
  source_url TEXT,
  event_date TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  entities TEXT[] DEFAULT '{}',
  sentiment_score DECIMAL(5,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  related_markets UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- 6. EVENT_MARKET_CORRELATIONS - Historical correlations
CREATE TABLE public.event_market_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  market_category VARCHAR(50) NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  correlation_coefficient DECIMAL(6,4),
  avg_price_impact DECIMAL(8,4),
  avg_time_to_impact INTERVAL,
  confidence_interval_low DECIMAL(6,4),
  confidence_interval_high DECIMAL(6,4),
  last_calculated TIMESTAMPTZ DEFAULT now()
);

-- 7. WHALE_WALLETS - Tracked high-value wallets
CREATE TABLE public.whale_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(255) UNIQUE NOT NULL,
  label VARCHAR(255),
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_volume DECIMAL(18,2) DEFAULT 0,
  win_rate DECIMAL(5,2) CHECK (win_rate >= 0 AND win_rate <= 100),
  avg_position_size DECIMAL(18,2) DEFAULT 0,
  profitable_trades INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  is_smart_money BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- 8. WHALE_TRANSACTIONS - Individual whale trades
CREATE TABLE public.whale_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.whale_wallets(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES public.market_outcomes(id) ON DELETE SET NULL,
  transaction_hash VARCHAR(255),
  side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
  price DECIMAL(8,4) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  block_number BIGINT
);

-- 9. KOL_ACCOUNTS - Tracked Key Opinion Leaders
CREATE TABLE public.kol_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('twitter', 'telegram', 'discord', 'substack')),
  platform_user_id VARCHAR(255),
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  follower_count INTEGER DEFAULT 0,
  category VARCHAR(100)[] DEFAULT '{}',
  influence_score DECIMAL(5,2) CHECK (influence_score >= 0 AND influence_score <= 100),
  accuracy_score DECIMAL(5,2) CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
  is_verified BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(platform, platform_user_id)
);

-- 10. KOL_SENTIMENT - Sentiment from KOL posts
CREATE TABLE public.kol_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kol_id UUID NOT NULL REFERENCES public.kol_accounts(id) ON DELETE CASCADE,
  content_hash VARCHAR(64) UNIQUE,
  content_snippet TEXT,
  full_content TEXT,
  platform VARCHAR(50),
  post_url TEXT,
  posted_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sentiment_score DECIMAL(5,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  topics TEXT[] DEFAULT '{}',
  entities TEXT[] DEFAULT '{}',
  related_markets UUID[] DEFAULT '{}',
  engagement_score INTEGER DEFAULT 0
);

-- 11. HISTORICAL_OUTCOMES - Resolved market data for backtesting
CREATE TABLE public.historical_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  winning_outcome_id UUID REFERENCES public.market_outcomes(id) ON DELETE SET NULL,
  resolution_value DECIMAL(8,4),
  resolution_source TEXT,
  resolved_at TIMESTAMPTZ NOT NULL,
  initial_probability DECIMAL(8,4),
  final_pre_resolution_probability DECIMAL(8,4),
  total_volume DECIMAL(18,2) DEFAULT 0,
  unique_traders INTEGER DEFAULT 0,
  price_path JSONB DEFAULT '[]'
);

-- 12. USER_WATCHLISTS - User's tracked markets
CREATE TABLE public.user_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  market_ids UUID[] DEFAULT '{}',
  alert_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. USER_ALERTS - Alert configurations
CREATE TABLE public.user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id UUID REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('price_threshold', 'arbitrage', 'whale_activity', 'event_trigger', 'volume_spike')),
  conditions JSONB NOT NULL DEFAULT '{}',
  channels VARCHAR(20)[] DEFAULT ARRAY['email'] CHECK (channels <@ ARRAY['email', 'push', 'sms']::VARCHAR[]),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Market lookups by platform + status
CREATE INDEX idx_markets_platform_status ON public.prediction_markets(platform, status);
CREATE INDEX idx_markets_category ON public.prediction_markets(category);
CREATE INDEX idx_markets_resolution_date ON public.prediction_markets(resolution_date) WHERE status = 'active';
CREATE INDEX idx_markets_updated_at ON public.prediction_markets(updated_at DESC);

-- Outcome lookups
CREATE INDEX idx_outcomes_market_id ON public.market_outcomes(market_id);
CREATE INDEX idx_outcomes_current_price ON public.market_outcomes(current_price);

-- Time-series queries on price history
CREATE INDEX idx_price_history_market_time ON public.market_price_history(market_id, timestamp DESC);
CREATE INDEX idx_price_history_outcome_time ON public.market_price_history(outcome_id, timestamp DESC);
CREATE INDEX idx_price_history_timestamp ON public.market_price_history(timestamp DESC);

-- Arbitrage scanning
CREATE INDEX idx_arbitrage_status ON public.arbitrage_opportunities(status) WHERE status = 'active';
CREATE INDEX idx_arbitrage_profit ON public.arbitrage_opportunities(profit_potential DESC) WHERE status = 'active';
CREATE INDEX idx_arbitrage_detected ON public.arbitrage_opportunities(detected_at DESC);

-- Event queries
CREATE INDEX idx_events_category ON public.real_world_events(category);
CREATE INDEX idx_events_severity ON public.real_world_events(severity);
CREATE INDEX idx_events_detected ON public.real_world_events(detected_at DESC);
CREATE INDEX idx_events_related_markets ON public.real_world_events USING GIN(related_markets);

-- Whale transaction analysis
CREATE INDEX idx_whale_txns_wallet ON public.whale_transactions(wallet_id, timestamp DESC);
CREATE INDEX idx_whale_txns_market ON public.whale_transactions(market_id, timestamp DESC);
CREATE INDEX idx_whale_txns_timestamp ON public.whale_transactions(timestamp DESC);
CREATE INDEX idx_whales_smart_money ON public.whale_wallets(is_smart_money) WHERE is_smart_money = true;
CREATE INDEX idx_whales_volume ON public.whale_wallets(total_volume DESC);

-- KOL sentiment aggregation
CREATE INDEX idx_kol_platform ON public.kol_accounts(platform);
CREATE INDEX idx_kol_influence ON public.kol_accounts(influence_score DESC);
CREATE INDEX idx_sentiment_kol ON public.kol_sentiment(kol_id, posted_at DESC);
CREATE INDEX idx_sentiment_posted ON public.kol_sentiment(posted_at DESC);
CREATE INDEX idx_sentiment_markets ON public.kol_sentiment USING GIN(related_markets);
CREATE INDEX idx_sentiment_topics ON public.kol_sentiment USING GIN(topics);

-- Historical outcomes for backtesting
CREATE INDEX idx_historical_market ON public.historical_outcomes(market_id);
CREATE INDEX idx_historical_resolved ON public.historical_outcomes(resolved_at DESC);

-- User data
CREATE INDEX idx_watchlists_user ON public.user_watchlists(user_id);
CREATE INDEX idx_alerts_user ON public.user_alerts(user_id);
CREATE INDEX idx_alerts_market ON public.user_alerts(market_id) WHERE market_id IS NOT NULL;
CREATE INDEX idx_alerts_active ON public.user_alerts(is_active) WHERE is_active = true;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbitrage_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_world_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_market_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whale_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whale_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kol_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kol_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ: Markets, outcomes, price history, events, correlations, historical outcomes
CREATE POLICY "Public read prediction markets"
  ON public.prediction_markets FOR SELECT
  USING (true);

CREATE POLICY "Public read market outcomes"
  ON public.market_outcomes FOR SELECT
  USING (true);

CREATE POLICY "Public read price history"
  ON public.market_price_history FOR SELECT
  USING (true);

CREATE POLICY "Public read real world events"
  ON public.real_world_events FOR SELECT
  USING (true);

CREATE POLICY "Public read event correlations"
  ON public.event_market_correlations FOR SELECT
  USING (true);

CREATE POLICY "Public read historical outcomes"
  ON public.historical_outcomes FOR SELECT
  USING (true);

CREATE POLICY "Public read arbitrage opportunities"
  ON public.arbitrage_opportunities FOR SELECT
  USING (true);

-- AUTHENTICATED READ: Whale data, KOL sentiment
CREATE POLICY "Authenticated read whale wallets"
  ON public.whale_wallets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read whale transactions"
  ON public.whale_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read KOL accounts"
  ON public.kol_accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated read KOL sentiment"
  ON public.kol_sentiment FOR SELECT
  TO authenticated
  USING (true);

-- USER-SPECIFIC: Watchlists and alerts
CREATE POLICY "Users can view own watchlists"
  ON public.user_watchlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own watchlists"
  ON public.user_watchlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists"
  ON public.user_watchlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists"
  ON public.user_watchlists FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts"
  ON public.user_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON public.user_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.user_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.user_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_prediction_markets_updated_at
  BEFORE UPDATE ON public.prediction_markets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_outcomes_updated_at
  BEFORE UPDATE ON public.market_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_watchlists_updated_at
  BEFORE UPDATE ON public.user_watchlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
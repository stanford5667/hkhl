-- Drop existing economic_indicators table and recreate with new schema
DROP TABLE IF EXISTS public.economic_indicators;

-- Create new economic_indicators table with expanded schema
CREATE TABLE public.economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_type TEXT NOT NULL CHECK (indicator_type IN ('rate', 'index', 'commodity', 'currency', 'crypto')),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('inflation', 'rates', 'energy', 'metals', 'agriculture', 'currency', 'crypto', 'indices')),
  current_value NUMERIC,
  previous_value NUMERIC,
  change_value NUMERIC,
  change_percent NUMERIC,
  unit TEXT DEFAULT '%',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT
);

-- Create user_watchlist table
CREATE TABLE public.user_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('stock', 'indicator', 'commodity', 'company')),
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS on both tables
ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

-- Economic indicators are public read-only
CREATE POLICY "Anyone can view economic indicators"
  ON public.economic_indicators FOR SELECT
  USING (true);

-- User watchlist policies
CREATE POLICY "Users can view their watchlist"
  ON public.user_watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their watchlist"
  ON public.user_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their watchlist"
  ON public.user_watchlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their watchlist"
  ON public.user_watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for fast search
CREATE INDEX idx_economic_indicators_symbol ON public.economic_indicators(symbol);
CREATE INDEX idx_economic_indicators_category ON public.economic_indicators(category);
CREATE INDEX idx_economic_indicators_type ON public.economic_indicators(indicator_type);
CREATE INDEX idx_user_watchlist_user_id ON public.user_watchlist(user_id);
CREATE INDEX idx_user_watchlist_item_type ON public.user_watchlist(item_type);

-- Seed economic indicators
INSERT INTO public.economic_indicators (indicator_type, symbol, name, category, current_value, unit, source) VALUES
-- Rates & Yields
('rate', 'US10Y', '10-Year Treasury Yield', 'rates', 4.52, '%', 'treasury'),
('rate', 'US2Y', '2-Year Treasury Yield', 'rates', 4.28, '%', 'treasury'),
('rate', 'US30Y', '30-Year Treasury Yield', 'rates', 4.71, '%', 'treasury'),
('rate', 'FEDFUNDS', 'Federal Funds Rate', 'rates', 4.33, '%', 'federal_reserve'),
('rate', 'PRIME', 'Prime Rate', 'rates', 7.50, '%', 'federal_reserve'),
-- Inflation
('index', 'CPI', 'Consumer Price Index', 'inflation', 314.69, 'index', 'bls'),
('rate', 'CPIYOY', 'CPI Year-over-Year', 'inflation', 2.7, '%', 'bls'),
('index', 'PCE', 'Personal Consumption Expenditures', 'inflation', 123.45, 'index', 'bea'),
('rate', 'PPI', 'Producer Price Index', 'inflation', 3.1, '%', 'bls'),
-- Energy
('commodity', 'WTI', 'Crude Oil WTI', 'energy', 71.50, '$', 'nymex'),
('commodity', 'BRENT', 'Brent Crude', 'energy', 75.20, '$', 'ice'),
('commodity', 'NATGAS', 'Natural Gas', 'energy', 3.25, '$', 'nymex'),
('commodity', 'GASOLINE', 'Gasoline', 'energy', 2.15, '$', 'nymex'),
-- Metals
('commodity', 'GOLD', 'Gold', 'metals', 2650.00, '$', 'comex'),
('commodity', 'SILVER', 'Silver', 'metals', 31.50, '$', 'comex'),
('commodity', 'COPPER', 'Copper', 'metals', 4.25, '$', 'comex'),
('commodity', 'PLATINUM', 'Platinum', 'metals', 985.00, '$', 'nymex'),
-- Agriculture
('commodity', 'CORN', 'Corn', 'agriculture', 4.52, '$', 'cbot'),
('commodity', 'WHEAT', 'Wheat', 'agriculture', 5.85, '$', 'cbot'),
('commodity', 'SOYBEAN', 'Soybeans', 'agriculture', 10.25, '$', 'cbot'),
('commodity', 'COFFEE', 'Coffee', 'agriculture', 3.15, '$', 'ice'),
-- Currencies
('currency', 'DXY', 'US Dollar Index', 'currency', 107.50, 'index', 'ice'),
('currency', 'EURUSD', 'Euro/USD', 'currency', 1.0525, '$', 'forex'),
('currency', 'GBPUSD', 'British Pound/USD', 'currency', 1.2650, '$', 'forex'),
('currency', 'USDJPY', 'USD/Japanese Yen', 'currency', 157.25, '¥', 'forex'),
-- Crypto
('crypto', 'BTC', 'Bitcoin', 'crypto', 94500.00, '$', 'crypto'),
('crypto', 'ETH', 'Ethereum', 'crypto', 3450.00, '$', 'crypto'),
-- Indices
('index', 'SPX', 'S&P 500', 'indices', 5950.00, 'index', 'market'),
('index', 'NDX', 'NASDAQ 100', 'indices', 21250.00, 'index', 'market'),
('index', 'DJI', 'Dow Jones', 'indices', 42500.00, 'index', 'market'),
('index', 'VIX', 'Volatility Index', 'indices', 13.50, 'index', 'cboe'),
('index', 'RUT', 'Russell 2000', 'indices', 2285.00, 'index', 'market');
-- Earnings Calendar and Estimates Tables
-- Migration: earnings_calendar_and_screening

-- Table to store earnings events and estimates
CREATE TABLE IF NOT EXISTS earnings_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol varchar(10) NOT NULL,
  company_name text,
  report_date date NOT NULL,
  fiscal_period varchar(10),
  fiscal_year integer,
  time_of_day varchar(20),
  estimated_time timestamp with time zone,
  actual_report_time timestamp with time zone,
  eps_estimate numeric(10, 4),
  eps_actual numeric(10, 4),
  revenue_estimate numeric(15, 2),
  revenue_actual numeric(15, 2),
  analyst_count integer,
  eps_surprise_pct numeric(10, 4),
  revenue_surprise_pct numeric(10, 4),
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(symbol, report_date, fiscal_period)
);

-- Table to store historical earnings surprise patterns
CREATE TABLE IF NOT EXISTS earnings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol varchar(10) NOT NULL,
  report_date date NOT NULL,
  fiscal_period varchar(10),
  eps_estimate numeric(10, 4),
  eps_actual numeric(10, 4),
  eps_surprise_pct numeric(10, 4),
  revenue_estimate numeric(15, 2),
  revenue_actual numeric(15, 2),
  revenue_surprise_pct numeric(10, 4),
  price_before numeric(10, 2),
  price_after numeric(10, 2),
  price_change_pct numeric(10, 4),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(symbol, report_date)
);

-- Table to store earnings predictions/signals
CREATE TABLE IF NOT EXISTS earnings_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  earnings_calendar_id uuid REFERENCES earnings_calendar(id) ON DELETE CASCADE,
  symbol varchar(10) NOT NULL,
  report_date date NOT NULL,
  predicted_outcome varchar(20),
  confidence_score numeric(5, 4),
  signals jsonb,
  model_version varchar(50),
  generated_at timestamp with time zone DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(earnings_calendar_id, user_id)
);

-- Indexes for performance (no partial index with CURRENT_DATE)
CREATE INDEX idx_earnings_calendar_symbol ON earnings_calendar(symbol);
CREATE INDEX idx_earnings_calendar_date ON earnings_calendar(report_date);

CREATE INDEX idx_earnings_history_symbol ON earnings_history(symbol);
CREATE INDEX idx_earnings_history_date ON earnings_history(report_date);

CREATE INDEX idx_earnings_predictions_symbol ON earnings_predictions(symbol);
CREATE INDEX idx_earnings_predictions_user ON earnings_predictions(user_id);
CREATE INDEX idx_earnings_predictions_calendar ON earnings_predictions(earnings_calendar_id);

-- RLS Policies
ALTER TABLE earnings_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_predictions ENABLE ROW LEVEL SECURITY;

-- Earnings calendar is public read (market data)
CREATE POLICY "Earnings calendar is publicly readable"
  ON earnings_calendar FOR SELECT
  USING (true);

-- Earnings history is public read
CREATE POLICY "Earnings history is publicly readable"
  ON earnings_history FOR SELECT
  USING (true);

-- Predictions are scoped to user
CREATE POLICY "Users can view their own predictions"
  ON earnings_predictions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own predictions"
  ON earnings_predictions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own predictions"
  ON earnings_predictions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own predictions"
  ON earnings_predictions FOR DELETE
  USING (user_id = auth.uid());

-- Function to calculate surprise percentage
CREATE OR REPLACE FUNCTION calculate_earnings_surprise()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.eps_actual IS NOT NULL AND NEW.eps_estimate IS NOT NULL AND NEW.eps_estimate != 0 THEN
    NEW.eps_surprise_pct := ((NEW.eps_actual - NEW.eps_estimate) / ABS(NEW.eps_estimate)) * 100;
  END IF;
  
  IF NEW.revenue_actual IS NOT NULL AND NEW.revenue_estimate IS NOT NULL AND NEW.revenue_estimate != 0 THEN
    NEW.revenue_surprise_pct := ((NEW.revenue_actual - NEW.revenue_estimate) / NEW.revenue_estimate) * 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER earnings_calendar_surprise_trigger
  BEFORE INSERT OR UPDATE ON earnings_calendar
  FOR EACH ROW
  EXECUTE FUNCTION calculate_earnings_surprise();

COMMENT ON TABLE earnings_calendar IS 'Upcoming and historical earnings events with estimates';
COMMENT ON TABLE earnings_history IS 'Historical earnings results for pattern analysis';
COMMENT ON TABLE earnings_predictions IS 'AI-generated predictions for earnings beats/misses';
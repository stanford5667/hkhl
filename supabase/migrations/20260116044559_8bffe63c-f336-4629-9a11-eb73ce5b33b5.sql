-- Create economic_calendar table for Fed meetings, earnings, economic releases
CREATE TABLE public.economic_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_date DATE NOT NULL,
  event_time TIME,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'fed', 'earnings', 'economic', 'holiday'
  description TEXT,
  importance TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  actual_value TEXT,
  forecast_value TEXT,
  previous_value TEXT,
  currency TEXT DEFAULT 'USD',
  country TEXT DEFAULT 'US',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient date queries
CREATE INDEX idx_economic_calendar_date ON public.economic_calendar(event_date);
CREATE INDEX idx_economic_calendar_type ON public.economic_calendar(event_type);

-- Enable RLS but allow public read (market data is public)
ALTER TABLE public.economic_calendar ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Economic calendar is publicly readable"
ON public.economic_calendar
FOR SELECT
USING (true);

-- Create data_sync_status table to track sync operations
CREATE TABLE public.data_sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'forex', 'commodities', 'economic', 'calendar'
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'success', 'failed'
  error_message TEXT,
  records_updated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sync_type)
);

-- Enable RLS with public read
ALTER TABLE public.data_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sync status is publicly readable"
ON public.data_sync_status
FOR SELECT
USING (true);

-- Insert initial sync status records
INSERT INTO public.data_sync_status (sync_type, status) VALUES
  ('forex', 'pending'),
  ('commodities', 'pending'),
  ('economic', 'pending'),
  ('calendar', 'pending');

-- Insert some initial calendar events (FOMC meetings 2025-2026)
INSERT INTO public.economic_calendar (event_date, event_name, event_type, importance, description) VALUES
  ('2025-01-29', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2025-03-19', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2025-05-07', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2025-06-18', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2025-07-30', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2025-09-17', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2025-11-05', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2025-12-17', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2026-01-28', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  ('2026-03-18', 'FOMC Meeting', 'fed', 'high', 'Federal Reserve Interest Rate Decision'),
  -- Monthly economic releases (recurring pattern)
  ('2025-02-07', 'Nonfarm Payrolls', 'economic', 'high', 'Monthly employment report'),
  ('2025-02-12', 'CPI Release', 'economic', 'high', 'Consumer Price Index'),
  ('2025-03-07', 'Nonfarm Payrolls', 'economic', 'high', 'Monthly employment report'),
  ('2025-03-12', 'CPI Release', 'economic', 'high', 'Consumer Price Index'),
  ('2025-04-04', 'Nonfarm Payrolls', 'economic', 'high', 'Monthly employment report'),
  ('2025-04-10', 'CPI Release', 'economic', 'high', 'Consumer Price Index');
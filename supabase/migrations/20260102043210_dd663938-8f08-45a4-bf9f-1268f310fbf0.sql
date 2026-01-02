-- Create ticker directory table for local search
CREATE TABLE public.ticker_directory (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exchange TEXT,
  sector TEXT,
  industry TEXT,
  market_cap_tier TEXT CHECK (market_cap_tier IN ('mega', 'large', 'mid', 'small', 'micro')),
  is_etf BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for fast search
CREATE INDEX idx_ticker_directory_symbol ON public.ticker_directory (symbol);
CREATE INDEX idx_ticker_directory_name ON public.ticker_directory USING gin (to_tsvector('english', name));
CREATE INDEX idx_ticker_directory_sector ON public.ticker_directory (sector);
CREATE INDEX idx_ticker_directory_market_cap ON public.ticker_directory (market_cap_tier);
CREATE INDEX idx_ticker_directory_active ON public.ticker_directory (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.ticker_directory ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public reference data)
CREATE POLICY "Anyone can view ticker directory"
ON public.ticker_directory
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_ticker_directory_updated_at
BEFORE UPDATE ON public.ticker_directory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
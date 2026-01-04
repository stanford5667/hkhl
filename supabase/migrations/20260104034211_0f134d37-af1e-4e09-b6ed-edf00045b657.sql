-- Create saved_portfolios table for portfolio visualizer
CREATE TABLE public.saved_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  allocations JSONB NOT NULL DEFAULT '[]',
  investor_profile JSONB,
  portfolio_mode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_portfolios ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own saved portfolios"
ON public.saved_portfolios
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved portfolios"
ON public.saved_portfolios
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved portfolios"
ON public.saved_portfolios
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved portfolios"
ON public.saved_portfolios
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_portfolios_updated_at
BEFORE UPDATE ON public.saved_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
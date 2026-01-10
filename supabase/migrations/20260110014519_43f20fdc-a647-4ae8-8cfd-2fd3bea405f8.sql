-- Create investment_plans table
CREATE TABLE IF NOT EXISTS public.investment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Investment Plan',
  responses JSONB DEFAULT '{}',
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_profile TEXT,
  investor_type TEXT,
  investor_type_name TEXT,
  plan_content TEXT,
  status TEXT DEFAULT 'complete' CHECK (status IN ('draft', 'complete'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investment_plans_user ON public.investment_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_plans_created ON public.investment_plans(created_at DESC);

-- Enable RLS
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own plans" ON public.investment_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans" ON public.investment_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans" ON public.investment_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans" ON public.investment_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_investment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER investment_plans_updated_at
  BEFORE UPDATE ON public.investment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_investment_plans_updated_at();
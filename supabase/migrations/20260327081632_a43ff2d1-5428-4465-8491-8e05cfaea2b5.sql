
CREATE TABLE public.elite_client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liquid_net_worth NUMERIC NOT NULL,
  capital_allocated NUMERIC NOT NULL,
  primary_objective TEXT NOT NULL,
  is_non_us_accredited BOOLEAN NOT NULL DEFAULT false,
  max_drawdown_tolerance NUMERIC NOT NULL DEFAULT 15,
  market_fears TEXT[] NOT NULL DEFAULT '{}',
  target_return_risk TEXT NOT NULL,
  options_approval TEXT NOT NULL DEFAULT 'no',
  rebalancing_frequency TEXT NOT NULL DEFAULT 'weekly',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.elite_client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own elite profile"
  ON public.elite_client_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own elite profile"
  ON public.elite_client_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own elite profile"
  ON public.elite_client_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all elite profiles"
  ON public.elite_client_profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

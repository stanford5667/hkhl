-- User usage tracking
CREATE TABLE public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ai_analyses_today INT DEFAULT 0,
  portfolio_count INT DEFAULT 0,
  saved_screens INT DEFAULT 0,
  alerts_today INT DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reset daily counters function
CREATE OR REPLACE FUNCTION public.reset_daily_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.user_usage
  SET ai_analyses_today = 0,
      alerts_today = 0,
      last_reset_at = NOW()
  WHERE last_reset_at::date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID, p_field TEXT)
RETURNS INT AS $$
DECLARE
  new_value INT;
BEGIN
  -- First reset if needed
  UPDATE public.user_usage
  SET ai_analyses_today = CASE WHEN last_reset_at::date < CURRENT_DATE THEN 0 ELSE ai_analyses_today END,
      alerts_today = CASE WHEN last_reset_at::date < CURRENT_DATE THEN 0 ELSE alerts_today END,
      last_reset_at = CASE WHEN last_reset_at::date < CURRENT_DATE THEN NOW() ELSE last_reset_at END
  WHERE user_id = p_user_id;

  -- Then increment
  EXECUTE format('
    UPDATE public.user_usage 
    SET %I = %I + 1, updated_at = NOW()
    WHERE user_id = $1
    RETURNING %I', p_field, p_field, p_field)
  INTO new_value
  USING p_user_id;
  
  RETURN new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create usage record on first access
CREATE OR REPLACE FUNCTION public.ensure_user_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_usage (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_usage
CREATE POLICY "Users can view own usage"
  ON public.user_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.user_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.user_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_usage_user_id ON public.user_usage(user_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
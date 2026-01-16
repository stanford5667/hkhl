-- Create event_alert_subscriptions table for users to subscribe to economic event alerts
CREATE TABLE public.event_alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Event targeting
  event_type TEXT,  -- NULL means all events
  event_name TEXT,  -- Specific event name (e.g., "CPI", "FOMC Meeting")
  importance TEXT[] DEFAULT ARRAY['high'],  -- low, medium, high
  countries TEXT[] DEFAULT ARRAY['US'],
  
  -- Alert timing
  alert_before_hours INTEGER DEFAULT 24,  -- Alert X hours before event
  alert_on_release BOOLEAN DEFAULT true,  -- Alert when data is released
  
  -- Notification channels
  in_app BOOLEAN DEFAULT true,
  email BOOLEAN DEFAULT false,
  push BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscriptions"
  ON public.event_alert_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON public.event_alert_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.event_alert_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.event_alert_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Add economic_event alert type to generated_alerts
-- Add index for faster queries
CREATE INDEX idx_event_alert_subscriptions_user ON public.event_alert_subscriptions(user_id);
CREATE INDEX idx_event_alert_subscriptions_event_type ON public.event_alert_subscriptions(event_type);

-- Create trigger for updated_at
CREATE TRIGGER update_event_alert_subscriptions_updated_at
  BEFORE UPDATE ON public.event_alert_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
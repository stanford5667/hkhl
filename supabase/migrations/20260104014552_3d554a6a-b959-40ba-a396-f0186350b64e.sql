-- Generated AI alerts (notifications)
CREATE TABLE public.generated_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  
  headline TEXT NOT NULL,
  summary TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  
  related_market_id UUID REFERENCES public.prediction_markets(id) ON DELETE SET NULL,
  related_news_ids UUID[] DEFAULT '{}'::uuid[],
  related_whale_txs UUID[] DEFAULT '{}'::uuid[],
  
  urgency VARCHAR(20) DEFAULT 'medium',
  confidence NUMERIC(3,2),
  
  suggested_actions JSONB DEFAULT '[]'::jsonb,
  why_it_matters TEXT,
  
  status VARCHAR(20) DEFAULT 'unread',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  CONSTRAINT generated_alerts_valid_urgency CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT generated_alerts_valid_status CHECK (status IN ('unread', 'read', 'actioned', 'dismissed'))
);

-- Indexes for performance
CREATE INDEX idx_generated_alerts_user ON public.generated_alerts(user_id);
CREATE INDEX idx_generated_alerts_status ON public.generated_alerts(status);
CREATE INDEX idx_generated_alerts_created ON public.generated_alerts(created_at DESC);
CREATE INDEX idx_generated_alerts_type ON public.generated_alerts(alert_type);

-- Enable RLS
ALTER TABLE public.generated_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for generated_alerts
CREATE POLICY "Users can view their own generated alerts"
  ON public.generated_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated alerts"
  ON public.generated_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated alerts"
  ON public.generated_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert alerts (for edge function)
CREATE POLICY "Service role can insert generated alerts"
  ON public.generated_alerts FOR INSERT
  WITH CHECK (true);
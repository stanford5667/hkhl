-- Create trade_ideas table
CREATE TABLE IF NOT EXISTS public.trade_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  direction VARCHAR(20) NOT NULL,
  entry_price DECIMAL(8,4),
  target_price DECIMAL(8,4),
  stop_loss_price DECIMAL(8,4),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  
  thesis_summary TEXT,
  thesis_detailed TEXT,
  supporting_evidence JSONB DEFAULT '[]'::jsonb,
  counter_arguments JSONB DEFAULT '[]'::jsonb,
  
  risk_level VARCHAR(20) DEFAULT 'medium',
  suggested_allocation DECIMAL(5,2),
  kelly_fraction DECIMAL(5,2),
  max_position DECIMAL(12,2),
  expected_value DECIMAL(8,4),
  
  time_horizon VARCHAR(20) DEFAULT 'days',
  catalyst_events JSONB DEFAULT '[]'::jsonb,
  
  market_title TEXT,
  platform VARCHAR(50),
  category VARCHAR(50),
  
  status VARCHAR(20) DEFAULT 'active',
  outcome VARCHAR(20),
  actual_return DECIMAL(8,4),
  resolved_at TIMESTAMPTZ,
  
  user_id UUID,
  is_public BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trade_idea_feedback table
CREATE TABLE IF NOT EXISTS public.trade_idea_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.trade_ideas(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(20) NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trade_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_idea_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for trade_ideas
CREATE POLICY "Public read trade ideas" ON public.trade_ideas
  FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create trade ideas" ON public.trade_ideas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own trade ideas" ON public.trade_ideas
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Service role full access trade ideas" ON public.trade_ideas
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for trade_idea_feedback
CREATE POLICY "Users can view own feedback" ON public.trade_idea_feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create feedback" ON public.trade_idea_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Service role full access feedback" ON public.trade_idea_feedback
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_trade_ideas_status ON public.trade_ideas(status);
CREATE INDEX idx_trade_ideas_confidence ON public.trade_ideas(confidence DESC);
CREATE INDEX idx_trade_ideas_generated ON public.trade_ideas(generated_at DESC);
CREATE INDEX idx_trade_ideas_category ON public.trade_ideas(category);
CREATE INDEX idx_trade_idea_feedback_idea ON public.trade_idea_feedback(idea_id);
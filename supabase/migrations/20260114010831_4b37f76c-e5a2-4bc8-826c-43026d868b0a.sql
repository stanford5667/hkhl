-- Create api_usage_logs table to track all API calls
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  endpoint TEXT,
  method TEXT DEFAULT 'POST',
  status_code INTEGER,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 6),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_date DATE GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED
);

-- Create indexes for efficient querying
CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_function_name ON public.api_usage_logs(function_name);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX idx_api_usage_logs_usage_date ON public.api_usage_logs(usage_date);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read API usage logs
CREATE POLICY "Admins can view all API usage logs"
ON public.api_usage_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- System/service role can insert logs (from edge functions)
CREATE POLICY "Service can insert API usage logs"
ON public.api_usage_logs FOR INSERT
TO authenticated
WITH CHECK (true);
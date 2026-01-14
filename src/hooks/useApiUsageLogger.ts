import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface LogApiUsageParams {
  functionName: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTimeMs?: number;
  tokensUsed?: number;
  costEstimate?: number;
  metadata?: Json;
}

/**
 * Logs API usage to the database for tracking and analytics
 * This should be called from edge functions or client-side after API calls
 */
export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('api_usage_logs').insert([{
      user_id: user?.id || null,
      function_name: params.functionName,
      endpoint: params.endpoint,
      method: params.method || 'POST',
      status_code: params.statusCode,
      response_time_ms: params.responseTimeMs,
      tokens_used: params.tokensUsed,
      cost_estimate: params.costEstimate,
      metadata: params.metadata ?? null,
    }]);
  } catch (error) {
    // Silently fail - logging shouldn't break the main functionality
    console.error('Failed to log API usage:', error);
  }
}

/**
 * Hook for creating an API usage logger with timing capabilities
 */
export function useApiUsageLogger() {
  const startTimer = () => {
    return performance.now();
  };

  const log = async (
    startTime: number, 
    functionName: string, 
    options?: Partial<Omit<LogApiUsageParams, 'functionName' | 'responseTimeMs'>>
  ) => {
    const responseTimeMs = Math.round(performance.now() - startTime);
    await logApiUsage({
      functionName,
      responseTimeMs,
      ...options,
    });
  };

  return { startTimer, log };
}

// Cost estimates per 1000 tokens for different APIs (approximate)
export const API_COST_RATES = {
  'openai-gpt-4': 0.03,
  'openai-gpt-3.5': 0.002,
  'gemini-pro': 0.00025,
  'perplexity': 0.001,
  'finnhub': 0, // Free tier
  'polygon': 0, // Per request pricing
} as const;

export function estimateCost(tokensUsed: number, apiType: keyof typeof API_COST_RATES): number {
  return (tokensUsed / 1000) * API_COST_RATES[apiType];
}

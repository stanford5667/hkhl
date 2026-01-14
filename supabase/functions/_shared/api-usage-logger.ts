// Shared API usage logger for edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface LogApiUsageParams {
  userId?: string | null;
  functionName: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTimeMs?: number;
  tokensUsed?: number;
  costEstimate?: number;
  metadata?: Record<string, unknown>;
}

// Cost estimates per 1000 tokens for different APIs (approximate)
export const API_COST_RATES: Record<string, number> = {
  'openai-gpt-4': 0.03,
  'openai-gpt-5': 0.05,
  'gemini-pro': 0.00025,
  'gemini-2.5-flash': 0.0001,
  'gemini-2.5-pro': 0.0005,
  'perplexity': 0.001,
  'finnhub': 0, // Free tier
  'polygon': 0.0001, // Estimated per request
  'lovable-ai': 0, // Free via Lovable
};

export function estimateCost(tokensUsed: number, apiType: string): number {
  const rate = API_COST_RATES[apiType] ?? 0;
  return (tokensUsed / 1000) * rate;
}

/**
 * Logs API usage to the database for tracking and analytics.
 * Should be called from edge functions after external API calls.
 */
export async function logApiUsage(params: LogApiUsageParams): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[API Logger] Missing Supabase credentials, skipping log');
      return;
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { error } = await supabase.from('api_usage_logs').insert([{
      user_id: params.userId || null,
      function_name: params.functionName,
      endpoint: params.endpoint || null,
      method: params.method || 'POST',
      status_code: params.statusCode || null,
      response_time_ms: params.responseTimeMs || null,
      tokens_used: params.tokensUsed || null,
      cost_estimate: params.costEstimate || null,
      metadata: params.metadata || null,
    }]);
    
    if (error) {
      console.error('[API Logger] Failed to log API usage:', error.message);
    }
  } catch (error) {
    // Silently fail - logging shouldn't break the main functionality
    console.error('[API Logger] Exception:', error);
  }
}

/**
 * Helper to create a timer for measuring response time
 */
export function startTimer(): number {
  return Date.now();
}

/**
 * Helper to calculate elapsed time in milliseconds
 */
export function getElapsedMs(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Wrapper function that logs API usage with timing
 */
export async function withApiLogging<T>(
  functionName: string,
  userId: string | null | undefined,
  apiCall: () => Promise<T>,
  options?: Partial<Omit<LogApiUsageParams, 'functionName' | 'userId' | 'responseTimeMs'>>
): Promise<T> {
  const startTime = startTimer();
  let statusCode = 200;
  
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    statusCode = 500;
    throw error;
  } finally {
    await logApiUsage({
      functionName,
      userId,
      responseTimeMs: getElapsedMs(startTime),
      statusCode,
      ...options,
    });
  }
}

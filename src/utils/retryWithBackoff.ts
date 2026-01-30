/**
 * Retry Utility with Exponential Backoff
 * 
 * Wraps async functions to automatically retry on failure with increasing delays.
 * Useful for edge functions that may cold start on first invocation.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 200,
  backoffMultiplier: 2,
};

/**
 * Executes an async function with automatic retry on failure.
 * Uses exponential backoff: 200ms → 400ms → 800ms
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @returns The result of the function on success
 * @throws The last error after all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, initialDelayMs, backoffMultiplier } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on the last attempt
      if (attempt < maxAttempts) {
        const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
        
        // Call optional retry callback
        options.onRetry?.(attempt, lastError);
        
        console.log(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`, lastError.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts exhausted
  throw lastError;
}

/**
 * Pre-warms a Supabase edge function by sending a lightweight ping.
 * Fire-and-forget - errors are silently caught.
 * 
 * @param supabase - Supabase client
 * @param functionName - Name of the edge function to warm
 */
export async function prewarmEdgeFunction(
  supabase: { functions: { invoke: (name: string, options: { body: unknown }) => Promise<unknown> } },
  functionName: string
): Promise<void> {
  try {
    await supabase.functions.invoke(functionName, {
      body: { ping: true }
    });
    console.log(`[Prewarm] Edge function "${functionName}" warmed up`);
  } catch (error) {
    // Silently ignore prewarm failures - it's just an optimization
    console.log(`[Prewarm] Failed to warm "${functionName}":`, error);
  }
}

/**
 * Batched Request Accumulator
 * 
 * Collects individual requests and batches them together,
 * reducing the number of API calls when many components
 * request data simultaneously.
 */

type BatchFn<T, R> = (items: T[]) => Promise<Map<T, R>>;

interface PendingRequest<T, R> {
  item: T;
  resolve: (value: R | null) => void;
  reject: (error: Error) => void;
}

class BatchAccumulator<T extends string | number, R> {
  private pending: PendingRequest<T, R>[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly delayMs: number;
  private readonly batchFn: BatchFn<T, R>;
  private readonly maxBatchSize: number;

  constructor(batchFn: BatchFn<T, R>, delayMs = 50, maxBatchSize = 50) {
    this.batchFn = batchFn;
    this.delayMs = delayMs;
    this.maxBatchSize = maxBatchSize;
  }

  /**
   * Add an item to the batch. Returns a promise that resolves
   * when the batch is processed.
   */
  request(item: T): Promise<R | null> {
    return new Promise((resolve, reject) => {
      this.pending.push({ item, resolve, reject });

      // If we've hit max batch size, flush immediately
      if (this.pending.length >= this.maxBatchSize) {
        this.flush();
        return;
      }

      // Otherwise, start/reset the timer
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout(() => this.flush(), this.delayMs);
    });
  }

  /**
   * Process the current batch
   */
  private async flush(): Promise<void> {
    if (this.pending.length === 0) return;

    // Take all pending requests
    const batch = this.pending.splice(0, this.pending.length);
    this.timer = null;

    // Deduplicate items
    const uniqueItems = [...new Set(batch.map(p => p.item))];

    try {
      const results = await this.batchFn(uniqueItems);

      // Resolve all pending promises
      for (const pending of batch) {
        const result = results.get(pending.item);
        pending.resolve(result ?? null);
      }
    } catch (error) {
      // Reject all pending promises
      for (const pending of batch) {
        pending.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Get count of pending requests (for debugging)
   */
  getPendingCount(): number {
    return this.pending.length;
  }
}

export { BatchAccumulator };

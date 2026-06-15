/**
 * Utility functions for adding timeouts to async operations
 */

/**
 * Adds a timeout to any promise or promise-like object
 * @param promise The promise to wrap with a timeout
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Custom error message
 * @returns Promise that rejects if timeout is exceeded
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number = 5000,
  errorMessage: string = 'Request timed out'
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Retry a function with exponential backoff
 * @param fn The function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay in milliseconds
 * @returns Promise that resolves with the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

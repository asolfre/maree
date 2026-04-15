/**
 * Fetch with exponential backoff retry for THREDDS OPeNDAP requests.
 *
 * THREDDS servers can be flaky — transient 502/503/504 errors and
 * connection resets are common, especially during heavy load or
 * when a new forecast run is being published. This utility retries
 * with jittered exponential backoff to improve reliability.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms before first retry. Default: 1000 */
  baseDelayMs?: number;
  /** Maximum delay in ms between retries. Default: 8000 */
  maxDelayMs?: number;
  /** Per-request timeout in ms. Default: 30000 */
  timeoutMs?: number;
  /** HTTP status codes to retry on. Default: [408, 429, 500, 502, 503, 504] */
  retryableStatuses?: number[];
}

const DEFAULT_RETRYABLE = [408, 429, 500, 502, 503, 504];

/**
 * Fetch a URL with exponential backoff retry.
 *
 * Retries on:
 * - Network/connection errors (fetch throws)
 * - Retryable HTTP status codes (502, 503, 504, etc.)
 *
 * Does NOT retry on:
 * - 404 (file genuinely missing)
 * - 400 (bad request — our URL is wrong)
 * - Other 4xx client errors
 *
 * @returns The successful Response object
 * @throws The last error if all attempts fail
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelay = options?.baseDelayMs ?? 1000;
  const maxDelay = options?.maxDelayMs ?? 8000;
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const retryable = options?.retryableStatuses ?? DEFAULT_RETRYABLE;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });

      // Non-retryable failure — throw immediately
      if (!response.ok && !retryable.includes(response.status)) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Retryable failure — retry if we have attempts left
      if (!response.ok && retryable.includes(response.status)) {
        lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
        if (attempt < maxAttempts) {
          await sleep(computeDelay(attempt, baseDelay, maxDelay));
          continue;
        }
        throw lastError;
      }

      // Success
      return response;
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error(String(err));

      // Non-retryable errors (e.g. 404 thrown above) — don't retry
      if (
        lastError.message.startsWith("HTTP 4") &&
        !lastError.message.startsWith("HTTP 408") &&
        !lastError.message.startsWith("HTTP 429")
      ) {
        throw lastError;
      }

      // Last attempt — throw
      if (attempt >= maxAttempts) {
        throw lastError;
      }

      // Wait before retrying
      await sleep(computeDelay(attempt, baseDelay, maxDelay));
    }
  }

  // Should not be reached, but TypeScript needs it
  throw lastError ?? new Error("fetchWithRetry: all attempts exhausted");
}

/**
 * Compute delay with exponential backoff + jitter.
 * delay = min(maxDelay, baseDelay * 2^(attempt-1)) * (0.5 + random(0, 0.5))
 */
function computeDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  const exponential = baseDelay * Math.pow(2, attempt - 1);
  const capped = Math.min(exponential, maxDelay);
  // Add jitter: 50–100% of the capped value
  const jitter = 0.5 + Math.random() * 0.5;
  return Math.round(capped * jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

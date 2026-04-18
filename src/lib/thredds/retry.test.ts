/**
 * Tests for fetchWithRetry — exponential backoff retry logic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "@/lib/thredds/retry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock Response with the given status. */
function mockResponse(status: number, body = ""): Response {
  return new Response(body, {
    status,
    statusText: status === 200 ? "OK" : `Error ${status}`,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Advance all pending timers so the sleep() calls resolve. */
  async function drainTimers() {
    await vi.runAllTimersAsync();
  }

  it("returns the response on first success", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));

    const res = await fetchWithRetry("https://example.com/data");
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 502 and succeeds on second attempt", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(mockResponse(502))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const promise = fetchWithRetry("https://example.com/data", undefined, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    // Drain the sleep timer between retries
    await drainTimers();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 and 504", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(504))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const promise = fetchWithRetry("https://example.com/data", undefined, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    await drainTimers();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on 404 (non-retryable)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockResponse(404));

    await expect(
      fetchWithRetry("https://example.com/data"),
    ).rejects.toThrow("HTTP 404");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws immediately on 400 (non-retryable)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockResponse(400));

    await expect(
      fetchWithRetry("https://example.com/data"),
    ).rejects.toThrow("HTTP 400");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 408 (Request Timeout)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(mockResponse(408))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const promise = fetchWithRetry("https://example.com/data", undefined, {
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    await drainTimers();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 (Too Many Requests)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(mockResponse(429))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const promise = fetchWithRetry("https://example.com/data", undefined, {
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    await drainTimers();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all attempts on retryable errors", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(mockResponse(502))
      .mockResolvedValueOnce(mockResponse(502))
      .mockResolvedValueOnce(mockResponse(502));

    const promise = fetchWithRetry("https://example.com/data", undefined, {
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    // Attach rejection handler immediately to avoid unhandled rejection warning
    const rejection = expect(promise).rejects.toThrow("HTTP 502");
    await drainTimers();
    await rejection;

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries on network errors (fetch throws)", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const promise = fetchWithRetry("https://example.com/data", undefined, {
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    await drainTimers();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting attempts on repeated network errors", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"));

    const promise = fetchWithRetry("https://example.com/data", undefined, {
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 50,
    });

    // Attach rejection handler immediately to avoid unhandled rejection warning
    const rejection = expect(promise).rejects.toThrow("Network error");
    await drainTimers();
    await rejection;

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("respects custom retryableStatuses", async () => {
    const mockFetch = vi.mocked(fetch);
    // 418 is not normally retryable, but we make it so
    mockFetch
      .mockResolvedValueOnce(mockResponse(418))
      .mockResolvedValueOnce(mockResponse(200, "ok"));

    const promise = fetchWithRetry("https://example.com/data", undefined, {
      maxAttempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 50,
      retryableStatuses: [418],
    });

    await drainTimers();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry when maxAttempts is 1", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockResponse(502));

    await expect(
      fetchWithRetry("https://example.com/data", undefined, {
        maxAttempts: 1,
      }),
    ).rejects.toThrow("HTTP 502");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("passes init options through to fetch", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(mockResponse(200, "ok"));

    const headers = { Authorization: "Bearer token" };
    await fetchWithRetry(
      "https://example.com/data",
      { headers },
      { timeoutMs: 5000 },
    );

    const callArgs = mockFetch.mock.calls[0];
    const passedHeaders = callArgs[1]?.headers as Headers;
    expect(passedHeaders).toBeInstanceOf(Headers);
    expect(passedHeaders.get("Authorization")).toBe("Bearer token");
    expect(passedHeaders.get("User-Agent")).toMatch(/^Maree\//);
  });
});

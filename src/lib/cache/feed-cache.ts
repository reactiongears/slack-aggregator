import { FeedResponse } from "@/lib/slack/types";

// In-memory feed response cache: one entry per workspace filter key
const cache = new Map<string, { data: FeedResponse; expiresAt: number }>();
const CACHE_TTL_MS = 15_000; // 15s — shorter than SWR poll so every other poll gets fresh data

// In-flight fetch promises for request coalescing
const inflight = new Map<string, Promise<FeedResponse>>();

function cacheKey(workspace?: string): string {
  return workspace ?? "__all__";
}

export function getFeedCache(
  workspace?: string
): FeedResponse | undefined {
  const key = cacheKey(workspace);
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  return undefined;
}

export function getStaleFeedCache(
  workspace?: string
): FeedResponse | undefined {
  const key = cacheKey(workspace);
  const entry = cache.get(key);
  return entry?.data;
}

export function setFeedCache(
  data: FeedResponse,
  workspace?: string
): void {
  const key = cacheKey(workspace);
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearFeedCache(): void {
  cache.clear();
}

/**
 * Request coalescing: if a fetch for this workspace is already in-flight,
 * return the same promise instead of starting a duplicate fetch.
 */
export function getOrStartFetch(
  workspace: string | undefined,
  fetchFn: () => Promise<FeedResponse>
): Promise<FeedResponse> {
  const key = cacheKey(workspace);

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fetchFn().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

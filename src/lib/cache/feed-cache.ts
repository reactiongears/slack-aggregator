import { FeedResponse } from "@/lib/slack/types";

// In-memory feed response cache: one entry per workspace filter key
const cache = new Map<string, { data: FeedResponse; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30s — matches SWR polling interval

export function getFeedCache(
  workspace?: string
): FeedResponse | undefined {
  const key = workspace ?? "__all__";
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  return undefined;
}

export function setFeedCache(
  data: FeedResponse,
  workspace?: string
): void {
  const key = workspace ?? "__all__";
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearFeedCache(): void {
  cache.clear();
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

// Slack API rate limit tiers (requests per minute)
const TIER_LIMITS: Record<number, number> = {
  1: 1,
  2: 20,
  3: 50,
  4: 100,
};

const buckets = new Map<string, Bucket>();

function getBucketKey(workspaceId: string, tier: number): string {
  return `${workspaceId}:${tier}`;
}

function refillBucket(bucket: Bucket, tier: number): void {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  const limit = TIER_LIMITS[tier] ?? 50;
  const refillRate = limit / 60000; // tokens per ms
  const tokensToAdd = elapsed * refillRate;
  bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

export function canProceed(workspaceId: string, tier: number): boolean {
  const key = getBucketKey(workspaceId, tier);
  const limit = TIER_LIMITS[tier] ?? 50;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit, lastRefill: Date.now() };
    buckets.set(key, bucket);
  }

  refillBucket(bucket, tier);
  return bucket.tokens >= 1;
}

export function recordCall(workspaceId: string, tier: number): void {
  const key = getBucketKey(workspaceId, tier);
  const limit = TIER_LIMITS[tier] ?? 50;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limit, lastRefill: Date.now() };
    buckets.set(key, bucket);
  }

  refillBucket(bucket, tier);
  bucket.tokens = Math.max(0, bucket.tokens - 1);
}

export async function waitForSlot(
  workspaceId: string,
  tier: number
): Promise<void> {
  while (!canProceed(workspaceId, tier)) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  recordCall(workspaceId, tier);
}

// Handle Slack 429 Retry-After headers
const retryAfter = new Map<string, number>();

export function setRetryAfter(workspaceId: string, seconds: number): void {
  retryAfter.set(workspaceId, Date.now() + seconds * 1000);
}

export function isRateLimited(workspaceId: string): boolean {
  const until = retryAfter.get(workspaceId);
  if (!until) return false;
  if (Date.now() >= until) {
    retryAfter.delete(workspaceId);
    return false;
  }
  return true;
}

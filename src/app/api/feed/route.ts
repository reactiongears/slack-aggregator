import { NextRequest, NextResponse } from "next/server";
import { fetchAllUnreads } from "@/lib/slack/fetcher";
import { FeedResponse } from "@/lib/slack/types";

export const dynamic = "force-dynamic";

// In-memory cache: one entry per workspace filter key
const cache = new Map<string, { data: FeedResponse; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30s — matches SWR polling interval

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const workspace = searchParams.get("workspace") ?? undefined;
    const cacheKey = workspace ?? "__all__";

    // Serve from cache if fresh
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }

    const feed = await fetchAllUnreads(workspace);

    cache.set(cacheKey, {
      data: feed,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(feed);
  } catch (error) {
    // On error, serve stale cache if available rather than showing an error
    const workspace = request.nextUrl.searchParams.get("workspace") ?? undefined;
    const cacheKey = workspace ?? "__all__";
    const stale = cache.get(cacheKey);
    if (stale) {
      return NextResponse.json(stale.data);
    }

    console.error("Feed fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed", details: String(error) },
      { status: 500 }
    );
  }
}

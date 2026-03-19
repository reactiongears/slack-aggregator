import { NextRequest, NextResponse } from "next/server";
import { fetchAllUnreads } from "@/lib/slack/fetcher";
import { getFeedCache, getStaleFeedCache, setFeedCache, getOrStartFetch } from "@/lib/cache/feed-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const workspace = searchParams.get("workspace") ?? undefined;

    // Serve from cache if fresh
    const cached = getFeedCache(workspace);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Cache expired — fetch fresh data with request coalescing
    // If another request is already fetching, we wait for it instead of
    // returning stale data or starting a duplicate fetch.
    const feed = await getOrStartFetch(workspace, async () => {
      const result = await fetchAllUnreads(workspace);
      setFeedCache(result, workspace);
      return result;
    });

    return NextResponse.json(feed);
  } catch (error) {
    // On error, serve stale cache if available rather than showing an error
    const workspace = request.nextUrl.searchParams.get("workspace") ?? undefined;
    const stale = getStaleFeedCache(workspace);
    if (stale) {
      return NextResponse.json(stale);
    }

    console.error("Feed fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed", details: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchAllUnreads } from "@/lib/slack/fetcher";
import { getFeedCache, setFeedCache } from "@/lib/cache/feed-cache";

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

    const feed = await fetchAllUnreads(workspace);
    setFeedCache(feed, workspace);

    return NextResponse.json(feed);
  } catch (error) {
    // On error, serve stale cache if available rather than showing an error
    const workspace = request.nextUrl.searchParams.get("workspace") ?? undefined;
    const cached = getFeedCache(workspace);
    if (cached) {
      return NextResponse.json(cached);
    }

    console.error("Feed fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed", details: String(error) },
      { status: 500 }
    );
  }
}

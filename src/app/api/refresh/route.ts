import { NextRequest, NextResponse } from "next/server";
import { fetchAllUnreads } from "@/lib/slack/fetcher";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const workspace = body.workspaceId as string | undefined;

    const feed = await fetchAllUnreads(workspace);

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh", details: String(error) },
      { status: 500 }
    );
  }
}

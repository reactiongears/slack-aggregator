import { NextRequest, NextResponse } from "next/server";
import { fetchAllUnreads } from "@/lib/slack/fetcher";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const workspace = searchParams.get("workspace") ?? undefined;

    const feed = await fetchAllUnreads(workspace);

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Feed fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed", details: String(error) },
      { status: 500 }
    );
  }
}

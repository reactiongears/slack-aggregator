import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/slack/client";
import { updateLastRead } from "@/lib/cache/channels";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, channelId, ts } = body;

    if (!workspaceId || !channelId || !ts) {
      return NextResponse.json(
        { error: "Missing required fields: workspaceId, channelId, ts" },
        { status: 400 }
      );
    }

    const client = getClient(workspaceId);
    await client.conversations.mark({
      channel: channelId,
      ts,
    });

    // Update local cache
    updateLastRead(workspaceId, channelId, ts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      { error: "Failed to mark as read", details: String(error) },
      { status: 500 }
    );
  }
}

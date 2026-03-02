import { NextResponse } from "next/server";
import { getClient } from "@/lib/slack/client";

export async function POST(request: Request) {
  try {
    const { workspaceId, channelId, timestamp, emoji } = await request.json();

    if (!workspaceId || !channelId || !timestamp || !emoji) {
      return NextResponse.json(
        { error: "Missing required fields: workspaceId, channelId, timestamp, emoji" },
        { status: 400 }
      );
    }

    const client = getClient(workspaceId);
    await client.reactions.add({
      channel: channelId,
      timestamp,
      name: emoji,
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    // already_reacted is not a real error — user already added this emoji
    const errData = error as { data?: { error?: string } };
    if (errData?.data?.error === "already_reacted") {
      return NextResponse.json({ ok: true });
    }

    console.error("Add reaction error:", error);
    return NextResponse.json(
      { error: "Failed to add reaction", details: String(error) },
      { status: 500 }
    );
  }
}

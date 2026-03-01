import { NextResponse } from "next/server";
import { getClient } from "@/lib/slack/client";

export async function POST(request: Request) {
  try {
    const { workspaceId, channelId, text, threadTs } = await request.json();

    if (!workspaceId || !channelId || !text) {
      return NextResponse.json(
        { error: "Missing required fields: workspaceId, channelId, text" },
        { status: 400 }
      );
    }

    const client = getClient(workspaceId);
    const result = await client.chat.postMessage({
      channel: channelId,
      text,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    });

    return NextResponse.json({ ok: true, ts: result.ts });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Failed to send message", details: String(error) },
      { status: 500 }
    );
  }
}

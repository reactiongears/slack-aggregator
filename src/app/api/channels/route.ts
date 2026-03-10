import { NextResponse } from "next/server";
import { getClient } from "@/lib/slack/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const client = getClient(workspaceId);

    const result = await client.conversations.list({
      types: "public_channel,private_channel,im,mpim",
      exclude_archived: true,
      limit: 500,
    });

    const channels = (result.channels ?? [])
      .filter((ch) => ch.is_member || ch.is_im || ch.is_mpim)
      .map((ch) => ({
        id: ch.id!,
        name: ch.name ?? (ch.is_im ? `DM` : "Unknown"),
        isPrivate: ch.is_private ?? false,
        isIm: ch.is_im ?? false,
        isMpim: ch.is_mpim ?? false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Get channels error:", error);
    return NextResponse.json({ error: "Failed to get channels" }, { status: 500 });
  }
}

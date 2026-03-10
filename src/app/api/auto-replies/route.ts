import { NextResponse } from "next/server";
import { getAllAutoReplies, createAutoReply } from "@/lib/auto-reply/queries";
import { CreateAutoReplyRequest } from "@/lib/auto-reply/types";

export async function GET() {
  try {
    const rules = getAllAutoReplies();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Get auto-replies error:", error);
    return NextResponse.json({ error: "Failed to get auto-replies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateAutoReplyRequest = await request.json();

    if (!body.scope || !body.replyText || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: "Missing required fields: scope, replyText, startTime, endTime" },
        { status: 400 }
      );
    }

    if (body.scope === "workspace" && !body.workspaceId) {
      return NextResponse.json({ error: "workspace scope requires workspaceId" }, { status: 400 });
    }
    if (body.scope === "channel" && (!body.workspaceId || !body.channelId)) {
      return NextResponse.json({ error: "channel scope requires workspaceId and channelId" }, { status: 400 });
    }
    if (body.scope === "user" && !body.userId) {
      return NextResponse.json({ error: "user scope requires userId" }, { status: 400 });
    }

    const rule = createAutoReply(body);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("Create auto-reply error:", error);
    return NextResponse.json({ error: "Failed to create auto-reply" }, { status: 500 });
  }
}

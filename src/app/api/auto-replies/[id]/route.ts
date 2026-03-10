import { NextResponse } from "next/server";
import { getAutoReplyById, updateAutoReply, deleteAutoReply } from "@/lib/auto-reply/queries";
import { UpdateAutoReplyRequest } from "@/lib/auto-reply/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rule = getAutoReplyById(id);
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Get auto-reply error:", error);
    return NextResponse.json({ error: "Failed to get auto-reply" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: UpdateAutoReplyRequest = await request.json();
    const rule = updateAutoReply(id, body);
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Update auto-reply error:", error);
    return NextResponse.json({ error: "Failed to update auto-reply" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = deleteAutoReply(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete auto-reply error:", error);
    return NextResponse.json({ error: "Failed to delete auto-reply" }, { status: 500 });
  }
}

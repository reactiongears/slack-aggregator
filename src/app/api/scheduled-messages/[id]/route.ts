import { NextResponse } from "next/server";
import { getScheduledMessageById, updateScheduledMessage, deleteScheduledMessage } from "@/lib/scheduler/queries";
import { UpdateScheduleRequest } from "@/lib/scheduler/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const message = getScheduledMessageById(id);
    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Get scheduled message error:", error);
    return NextResponse.json({ error: "Failed to get scheduled message" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: UpdateScheduleRequest = await request.json();
    const message = updateScheduledMessage(id, body);
    if (!message) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Update scheduled message error:", error);
    return NextResponse.json({ error: "Failed to update scheduled message" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = deleteScheduledMessage(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete scheduled message error:", error);
    return NextResponse.json({ error: "Failed to delete scheduled message" }, { status: 500 });
  }
}

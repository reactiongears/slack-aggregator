import { NextResponse } from "next/server";
import { getAllScheduledMessages, createScheduledMessage } from "@/lib/scheduler/queries";
import { CreateScheduleRequest } from "@/lib/scheduler/types";

export async function GET() {
  try {
    const messages = getAllScheduledMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get scheduled messages error:", error);
    return NextResponse.json({ error: "Failed to get scheduled messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: CreateScheduleRequest = await request.json();

    if (!body.workspaceId || !body.channelId || !body.text || !body.scheduleType || !body.time) {
      return NextResponse.json(
        { error: "Missing required fields: workspaceId, channelId, text, scheduleType, time" },
        { status: 400 }
      );
    }

    if (body.scheduleType === "days_of_week" && (!body.daysOfWeek || body.daysOfWeek.length === 0)) {
      return NextResponse.json(
        { error: "days_of_week schedule type requires daysOfWeek array" },
        { status: 400 }
      );
    }

    const message = createScheduledMessage(body);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Create scheduled message error:", error);
    return NextResponse.json({ error: "Failed to create scheduled message" }, { status: 500 });
  }
}

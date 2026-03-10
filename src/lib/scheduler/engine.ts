import { ScheduleType } from "./types";
import { getDueMessages, markSent } from "./queries";
import { getClient } from "@/lib/slack/client";
import { processAutoReplies } from "@/lib/auto-reply/engine";

export function computeNextRun(
  scheduleType: ScheduleType,
  time: string, // HH:MM
  daysOfWeek: number[] | null,
  fromMs: number
): number {
  const [hours, minutes] = time.split(":").map(Number);
  const from = new Date(fromMs);

  if (scheduleType === "once") {
    // Next occurrence of this time today, or tomorrow if already passed
    const target = new Date(from);
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= fromMs) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime();
  }

  if (scheduleType === "daily") {
    const target = new Date(from);
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= fromMs) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime();
  }

  if (scheduleType === "days_of_week" && daysOfWeek && daysOfWeek.length > 0) {
    // Find the next matching day
    const sorted = [...daysOfWeek].sort((a, b) => a - b);
    for (let offset = 0; offset < 7; offset++) {
      const candidate = new Date(from);
      candidate.setDate(candidate.getDate() + offset);
      candidate.setHours(hours, minutes, 0, 0);
      const dayOfWeek = candidate.getDay();
      if (sorted.includes(dayOfWeek) && candidate.getTime() > fromMs) {
        return candidate.getTime();
      }
    }
    // Fallback: next week's first matching day
    const candidate = new Date(from);
    candidate.setDate(candidate.getDate() + 7);
    candidate.setHours(hours, minutes, 0, 0);
    return candidate.getTime();
  }

  // Fallback
  const fallback = new Date(from);
  fallback.setHours(hours, minutes, 0, 0);
  fallback.setDate(fallback.getDate() + 1);
  return fallback.getTime();
}

export async function processScheduledMessages(): Promise<void> {
  const now = Date.now();
  const due = getDueMessages(now);

  for (const msg of due) {
    // Check if past end time
    if (msg.endTime && now > msg.endTime) {
      markSent(msg.id, null, "End time reached");
      continue;
    }

    try {
      const client = getClient(msg.workspaceId);
      await client.chat.postMessage({
        channel: msg.channelId,
        text: msg.text,
      });

      // Compute next run
      let nextRun: number | null = null;
      if (msg.scheduleType !== "once") {
        nextRun = computeNextRun(msg.scheduleType, msg.time, msg.daysOfWeek, now);
        // If next run is past end time, disable
        if (msg.endTime && nextRun > msg.endTime) {
          nextRun = null;
        }
      }

      markSent(msg.id, nextRun);
      console.log(`[scheduler] Sent scheduled message ${msg.id} to ${msg.channelName}`);
    } catch (error) {
      console.error(`[scheduler] Failed to send message ${msg.id}:`, error);
      // Still advance next_run so we don't spam on error
      let nextRun: number | null = null;
      if (msg.scheduleType !== "once") {
        nextRun = computeNextRun(msg.scheduleType, msg.time, msg.daysOfWeek, now);
      }
      markSent(msg.id, nextRun, String(error));
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (intervalId) return;
  console.log("[scheduler] Starting scheduler (30s tick)");
  // Run immediately on start
  processScheduledMessages().catch(console.error);
  processAutoReplies().catch(console.error);
  // Then every 30 seconds
  intervalId = setInterval(() => {
    processScheduledMessages().catch(console.error);
    processAutoReplies().catch(console.error);
  }, 30_000);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[scheduler] Stopped");
  }
}

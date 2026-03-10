import { getDb } from "@/lib/cache/db";
import { ScheduledMessage, CreateScheduleRequest, UpdateScheduleRequest } from "./types";
import { computeNextRun } from "./engine";

function rowToMessage(row: Record<string, unknown>): ScheduledMessage {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    channelId: row.channel_id as string,
    channelName: (row.channel_name as string) ?? "",
    text: row.text as string,
    scheduleType: row.schedule_type as ScheduledMessage["scheduleType"],
    time: row.time as string,
    daysOfWeek: row.days_of_week ? JSON.parse(row.days_of_week as string) : null,
    nextRun: row.next_run as number,
    endTime: (row.end_time as number) ?? null,
    enabled: (row.enabled as number) === 1,
    lastSent: (row.last_sent as number) ?? null,
    lastError: (row.last_error as string) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export function getAllScheduledMessages(): ScheduledMessage[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM scheduled_messages ORDER BY next_run ASC").all();
  return (rows as Record<string, unknown>[]).map(rowToMessage);
}

export function getScheduledMessageById(id: string): ScheduledMessage | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM scheduled_messages WHERE id = ?").get(id);
  return row ? rowToMessage(row as Record<string, unknown>) : null;
}

export function getDueMessages(now: number): ScheduledMessage[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM scheduled_messages WHERE enabled = 1 AND next_run <= ?")
    .all(now);
  return (rows as Record<string, unknown>[]).map(rowToMessage);
}

export function createScheduledMessage(req: CreateScheduleRequest): ScheduledMessage {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const daysJson = req.daysOfWeek ? JSON.stringify(req.daysOfWeek) : null;
  const nextRun = computeNextRun(req.scheduleType, req.time, req.daysOfWeek ?? null, now);

  db.prepare(`
    INSERT INTO scheduled_messages (id, workspace_id, channel_id, channel_name, text, schedule_type, time, days_of_week, next_run, end_time, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, req.workspaceId, req.channelId, req.channelName, req.text, req.scheduleType, req.time, daysJson, nextRun, req.endTime ?? null, now, now);

  return getScheduledMessageById(id)!;
}

export function updateScheduledMessage(id: string, req: UpdateScheduleRequest): ScheduledMessage | null {
  const db = getDb();
  const existing = getScheduledMessageById(id);
  if (!existing) return null;

  const now = Date.now();
  const scheduleType = req.scheduleType ?? existing.scheduleType;
  const time = req.time ?? existing.time;
  const daysOfWeek = req.daysOfWeek ?? existing.daysOfWeek;
  const enabled = req.enabled ?? existing.enabled;
  const text = req.text ?? existing.text;
  const endTime = req.endTime !== undefined ? req.endTime : existing.endTime;
  const daysJson = daysOfWeek ? JSON.stringify(daysOfWeek) : null;

  const nextRun = enabled
    ? computeNextRun(scheduleType, time, daysOfWeek, now)
    : existing.nextRun;

  db.prepare(`
    UPDATE scheduled_messages
    SET text = ?, schedule_type = ?, time = ?, days_of_week = ?, next_run = ?, end_time = ?, enabled = ?, updated_at = ?
    WHERE id = ?
  `).run(text, scheduleType, time, daysJson, nextRun, endTime, enabled ? 1 : 0, now, id);

  return getScheduledMessageById(id);
}

export function deleteScheduledMessage(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM scheduled_messages WHERE id = ?").run(id);
  return result.changes > 0;
}

export function markSent(id: string, nextRun: number | null, error?: string): void {
  const db = getDb();
  const now = Date.now();

  if (nextRun === null) {
    // One-time message: disable after sending
    db.prepare(`
      UPDATE scheduled_messages SET last_sent = ?, last_error = ?, enabled = 0, updated_at = ? WHERE id = ?
    `).run(now, error ?? null, now, id);
  } else {
    db.prepare(`
      UPDATE scheduled_messages SET last_sent = ?, last_error = ?, next_run = ?, updated_at = ? WHERE id = ?
    `).run(now, error ?? null, nextRun, now, id);
  }
}

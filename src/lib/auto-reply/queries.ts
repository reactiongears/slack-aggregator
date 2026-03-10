import { getDb } from "@/lib/cache/db";
import { AutoReply, CreateAutoReplyRequest, UpdateAutoReplyRequest } from "./types";

function rowToAutoReply(row: Record<string, unknown>): AutoReply {
  return {
    id: row.id as string,
    scope: row.scope as AutoReply["scope"],
    workspaceId: (row.workspace_id as string) ?? null,
    channelId: (row.channel_id as string) ?? null,
    channelName: (row.channel_name as string) ?? null,
    userId: (row.user_id as string) ?? null,
    userName: (row.user_name as string) ?? null,
    replyText: row.reply_text as string,
    startTime: row.start_time as number,
    endTime: row.end_time as number,
    enabled: (row.enabled as number) === 1,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export function getAllAutoReplies(): AutoReply[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM auto_replies ORDER BY created_at DESC").all();
  return (rows as Record<string, unknown>[]).map(rowToAutoReply);
}

export function getAutoReplyById(id: string): AutoReply | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM auto_replies WHERE id = ?").get(id);
  return row ? rowToAutoReply(row as Record<string, unknown>) : null;
}

export function getActiveAutoReplies(now: number): AutoReply[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM auto_replies WHERE enabled = 1 AND start_time <= ? AND end_time > ?")
    .all(now, now);
  return (rows as Record<string, unknown>[]).map(rowToAutoReply);
}

export function createAutoReply(req: CreateAutoReplyRequest): AutoReply {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO auto_replies (id, scope, workspace_id, channel_id, channel_name, user_id, user_name, reply_text, start_time, end_time, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    req.scope,
    req.workspaceId ?? null,
    req.channelId ?? null,
    req.channelName ?? null,
    req.userId ?? null,
    req.userName ?? null,
    req.replyText,
    req.startTime,
    req.endTime,
    now,
    now
  );

  return getAutoReplyById(id)!;
}

export function updateAutoReply(id: string, req: UpdateAutoReplyRequest): AutoReply | null {
  const db = getDb();
  const existing = getAutoReplyById(id);
  if (!existing) return null;

  const now = Date.now();
  const replyText = req.replyText ?? existing.replyText;
  const startTime = req.startTime ?? existing.startTime;
  const endTime = req.endTime ?? existing.endTime;
  const enabled = req.enabled ?? existing.enabled;

  db.prepare(`
    UPDATE auto_replies SET reply_text = ?, start_time = ?, end_time = ?, enabled = ?, updated_at = ? WHERE id = ?
  `).run(replyText, startTime, endTime, enabled ? 1 : 0, now, id);

  return getAutoReplyById(id);
}

export function deleteAutoReply(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM auto_replies WHERE id = ?").run(id);
  // Also clean up log entries
  db.prepare("DELETE FROM auto_reply_log WHERE rule_id = ?").run(id);
  return result.changes > 0;
}

export function hasReplied(ruleId: string, workspaceId: string, channelId: string, messageTs: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM auto_reply_log WHERE rule_id = ? AND workspace_id = ? AND channel_id = ? AND message_ts = ?")
    .get(ruleId, workspaceId, channelId, messageTs);
  return !!row;
}

export function logReply(ruleId: string, workspaceId: string, channelId: string, messageTs: string): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO auto_reply_log (rule_id, workspace_id, channel_id, message_ts, replied_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(ruleId, workspaceId, channelId, messageTs, Date.now());
}

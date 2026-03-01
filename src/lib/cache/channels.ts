import { getDb } from "./db";

const CHANNEL_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedChannel {
  workspace_id: string;
  channel_id: string;
  name: string;
  type: string;
  last_read: string;
  latest_ts: string;
  user_id: string | null;
  updated_at: number;
}

export function getCachedChannel(
  workspaceId: string,
  channelId: string
): CachedChannel | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM channels WHERE workspace_id = ? AND channel_id = ? AND updated_at > ?"
    )
    .get(workspaceId, channelId, Date.now() - CHANNEL_TTL_MS) as
    | CachedChannel
    | undefined;

  return row ?? null;
}

export function upsertChannel(
  workspaceId: string,
  channelId: string,
  name: string,
  type: string,
  lastRead: string,
  latestTs: string,
  userId?: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO channels (workspace_id, channel_id, name, type, last_read, latest_ts, user_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, channel_id) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       last_read = excluded.last_read,
       latest_ts = excluded.latest_ts,
       user_id = excluded.user_id,
       updated_at = excluded.updated_at`
  ).run(
    workspaceId,
    channelId,
    name,
    type,
    lastRead,
    latestTs,
    userId ?? null,
    Date.now()
  );
}

export function updateLastRead(
  workspaceId: string,
  channelId: string,
  lastRead: string
): void {
  const db = getDb();
  db.prepare(
    "UPDATE channels SET last_read = ?, updated_at = ? WHERE workspace_id = ? AND channel_id = ?"
  ).run(lastRead, Date.now(), workspaceId, channelId);
}

export function getAllChannels(workspaceId: string): CachedChannel[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM channels WHERE workspace_id = ?")
    .all(workspaceId) as CachedChannel[];
}

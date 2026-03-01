import { getDb } from "./db";
import { CachedUser } from "../slack/types";

const USER_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedUser(
  workspaceId: string,
  userId: string
): CachedUser | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM users WHERE workspace_id = ? AND user_id = ? AND updated_at > ?"
    )
    .get(workspaceId, userId, Date.now() - USER_TTL_MS) as CachedUser | undefined;

  if (!row) return null;

  return {
    workspaceId: row.workspaceId,
    userId: row.userId,
    displayName: row.displayName,
    realName: row.realName,
    avatarUrl: row.avatarUrl,
    updatedAt: row.updatedAt,
  };
}

export function upsertUser(
  workspaceId: string,
  userId: string,
  displayName: string,
  realName: string,
  avatarUrl: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (workspace_id, user_id, display_name, real_name, avatar_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, user_id) DO UPDATE SET
       display_name = excluded.display_name,
       real_name = excluded.real_name,
       avatar_url = excluded.avatar_url,
       updated_at = excluded.updated_at`
  ).run(workspaceId, userId, displayName, realName, avatarUrl, Date.now());
}

export function getCachedUserRaw(
  workspaceId: string,
  userId: string
): { display_name: string; real_name: string; avatar_url: string } | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT display_name, real_name, avatar_url FROM users WHERE workspace_id = ? AND user_id = ? AND updated_at > ?"
    )
    .get(workspaceId, userId, Date.now() - USER_TTL_MS) as
    | { display_name: string; real_name: string; avatar_url: string }
    | undefined;

  return row ?? null;
}

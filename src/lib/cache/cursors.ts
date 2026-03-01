import { getDb } from "./db";

export function getMyUserId(workspaceId: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT my_user_id FROM workspaces WHERE id = ?")
    .get(workspaceId) as { my_user_id: string } | undefined;

  return row?.my_user_id ?? null;
}

export function setMyUserId(workspaceId: string, userId: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO workspaces (id, team_id, team_name, team_domain, my_user_id, updated_at)
     VALUES (?, '', '', '', ?, ?)
     ON CONFLICT(id) DO UPDATE SET my_user_id = excluded.my_user_id, updated_at = excluded.updated_at`
  ).run(workspaceId, userId, Date.now());
}

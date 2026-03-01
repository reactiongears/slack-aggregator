import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), "data", "cache.db");
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      workspace_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      name TEXT,
      type TEXT,
      last_read TEXT,
      latest_ts TEXT,
      user_id TEXT,
      updated_at INTEGER,
      PRIMARY KEY (workspace_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      display_name TEXT,
      real_name TEXT,
      avatar_url TEXT,
      updated_at INTEGER,
      PRIMARY KEY (workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      team_name TEXT,
      team_domain TEXT,
      icon_url TEXT,
      my_user_id TEXT,
      updated_at INTEGER
    );
  `);

  return db;
}

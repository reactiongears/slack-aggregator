import { NextResponse } from "next/server";
import { getClient } from "@/lib/slack/client";
import { getDb } from "@/lib/cache/db";

interface UserEntry {
  id: string;
  displayName: string;
  realName: string;
  avatar: string;
}

function getCachedUsers(workspaceId: string): UserEntry[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT user_id, display_name, real_name, avatar_url FROM users WHERE workspace_id = ?")
    .all(workspaceId) as { user_id: string; display_name: string; real_name: string; avatar_url: string }[];

  return rows.map((r) => ({
    id: r.user_id,
    displayName: r.display_name || r.real_name || r.user_id,
    realName: r.real_name || "",
    avatar: r.avatar_url || "",
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    // Start with cached users (people seen in the feed)
    const cached = getCachedUsers(workspaceId);
    const seen = new Map<string, UserEntry>();
    for (const u of cached) {
      seen.set(u.id, u);
    }

    // Try to supplement with full workspace user list
    try {
      const client = getClient(workspaceId);
      const result = await client.users.list({ limit: 500 });

      for (const u of result.members ?? []) {
        if (u.deleted || u.is_bot || u.id === "USLACKBOT" || !u.id) continue;
        // API data takes priority over cached
        seen.set(u.id, {
          id: u.id,
          displayName: u.profile?.display_name || u.real_name || u.name || u.id,
          realName: u.real_name || "",
          avatar: u.profile?.image_48 || "",
        });
      }
    } catch {
      // users.list may fail for guest accounts — cached users still returned
    }

    const users = [...seen.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 });
  }
}

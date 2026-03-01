import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { loadWorkspaceConfigs } from "@/lib/slack/config";
import { updateWorkspaceCookie } from "@/lib/slack/browser-auth";
import { clearClients } from "@/lib/slack/client";
import { clearFeedCache } from "@/lib/cache/feed-cache";

/**
 * POST /api/auth/try-refresh
 * Try existing cookies from other workspaces against a failing workspace.
 * If any cookie works, update the workspace and return success.
 * No browser login needed.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const targetId: string = body.workspaceId;

  const allConfigs = loadWorkspaceConfigs();
  const target = allConfigs.find((c) => c.id === targetId);

  if (!target) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 404 }
    );
  }

  // Collect unique cookies from other workspaces
  const otherCookies = new Set<string>();
  for (const config of allConfigs) {
    if (config.id !== targetId && config.cookie) {
      otherCookies.add(config.cookie);
    }
  }

  // Try each cookie against the target workspace
  for (const cookie of otherCookies) {
    try {
      const client = new WebClient(target.token, {
        headers: { cookie: `d=${cookie}` },
      });
      const res = await client.auth.test();
      if (res.ok) {
        updateWorkspaceCookie(target.id, cookie);
        clearClients();
        clearFeedCache();
        return NextResponse.json({
          ok: true,
          workspace: target.teamName,
        });
      }
    } catch {
      // This cookie didn't work — try the next one
    }
  }

  return NextResponse.json({ ok: false });
}

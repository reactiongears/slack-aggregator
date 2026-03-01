import { NextResponse } from "next/server";
import {
  launchSlackAuth,
  saveWorkspacesToEnv,
  updateWorkspaceCookie,
  DiscoveredWorkspace,
} from "@/lib/slack/browser-auth";
import { WebClient } from "@slack/web-api";
import { loadWorkspaceConfigs } from "@/lib/slack/config";
import { clearClients } from "@/lib/slack/client";
import { clearFeedCache } from "@/lib/cache/feed-cache";

// In-flight auth state so we can poll from the client
let authState: {
  status: "idle" | "waiting" | "done" | "error";
  workspaces?: DiscoveredWorkspace[];
  cookie?: string;
  error?: string;
} = { status: "idle" };

// POST /api/auth — launch browser login
export async function POST() {
  if (authState.status === "waiting") {
    return NextResponse.json(
      { error: "A login window is already open." },
      { status: 409 }
    );
  }

  authState = { status: "waiting" };

  // Run async — don't block the response
  launchSlackAuth()
    .then((result) => {
      authState = {
        status: "done",
        workspaces: result.workspaces,
        cookie: result.cookie,
      };
    })
    .catch((err) => {
      authState = {
        status: "error",
        error: err.message,
      };
    });

  return NextResponse.json({ status: "waiting" });
}

// GET /api/auth — poll for result
export async function GET() {
  return NextResponse.json(authState);
}

// PUT /api/auth — confirm and save selected workspaces
export async function PUT(request: Request) {
  const body = await request.json();
  const selectedIds: string[] = body.workspaceIds;

  if (!authState.cookie || !authState.workspaces) {
    return NextResponse.json(
      { error: "No auth session. Start login first." },
      { status: 400 }
    );
  }

  const selected = authState.workspaces.filter((w) =>
    selectedIds.includes(w.id)
  );

  if (selected.length === 0) {
    return NextResponse.json(
      { error: "No workspaces selected." },
      { status: 400 }
    );
  }

  saveWorkspacesToEnv(authState.cookie, selected);
  clearClients();
  clearFeedCache();

  // Auto-refresh other workspaces with the fresh cookie.
  // Each login invalidates the old d cookie, so we ALWAYS try the fresh one
  // first. Workspaces on a separate OAuth (e.g. TechStyle) won't match — for
  // those we fall back to their existing per-workspace cookie.
  const refreshedNames: string[] = [];
  const freshCookie = authState.cookie;
  const selectedTeamIds = new Set(selected.map((w) => w.teamId));

  try {
    const allConfigs = loadWorkspaceConfigs();
    const others = allConfigs.filter((c) => !selectedTeamIds.has(c.teamId));

    await Promise.allSettled(
      others.map(async (config) => {
        // Always try the fresh cookie first — the old one is likely dead
        // since this new login replaced the session
        try {
          const client = new WebClient(config.token, {
            headers: { cookie: `d=${freshCookie}` },
          });
          const res = await client.auth.test();
          if (res.ok) {
            updateWorkspaceCookie(config.id, freshCookie);
            refreshedNames.push(config.teamName);
            return;
          }
        } catch {
          // fresh cookie doesn't work — different OAuth session
        }

        // Fall back to existing cookie (separate OAuth, e.g. TechStyle)
        if (config.cookie && config.cookie !== freshCookie) {
          try {
            const client = new WebClient(config.token, {
              headers: { cookie: `d=${config.cookie}` },
            });
            const res = await client.auth.test();
            if (res.ok) {
              refreshedNames.push(config.teamName);
              return; // existing cookie from a different session still valid
            }
          } catch {
            // both cookies failed — workspace needs separate login
          }
        }
      })
    );

    if (refreshedNames.length > 0) {
      clearClients(); // re-clear so clients pick up updated cookies
      console.log(`Auto-refreshed: ${refreshedNames.join(", ")}`);
    }
  } catch {
    // Non-critical — other workspaces may still need manual re-login
  }

  // Reset auth state
  authState = { status: "idle" };

  return NextResponse.json({
    ok: true,
    added: selected.map((w) => w.name),
    refreshed: refreshedNames,
  });
}

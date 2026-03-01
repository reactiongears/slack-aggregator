import { NextResponse } from "next/server";
import {
  launchSlackAuth,
  saveWorkspacesToEnv,
  DiscoveredWorkspace,
} from "@/lib/slack/browser-auth";
import { clearClients } from "@/lib/slack/client";

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

  // Reset auth state
  authState = { status: "idle" };

  return NextResponse.json({
    ok: true,
    added: selected.map((w) => w.name),
  });
}

import { NextResponse } from "next/server";
import { loadIgnores, addIgnore, removeIgnore } from "@/lib/ignores";

// GET /api/ignores — list all ignored users/channels
export async function GET() {
  const list = loadIgnores();
  return NextResponse.json(list);
}

// POST /api/ignores — add a user or channel to ignore list
export async function POST(request: Request) {
  const body = await request.json();
  const { type, id, name, workspaceId, workspaceName } = body;

  if (!type || !id || !workspaceId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const entry = addIgnore({ type, id, name, workspaceId, workspaceName });
  return NextResponse.json({ ok: true, entry });
}

// DELETE /api/ignores — remove from ignore list
export async function DELETE(request: Request) {
  const body = await request.json();
  const { type, id, workspaceId } = body;

  if (!type || !id || !workspaceId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const removed = removeIgnore(type, id, workspaceId);
  return NextResponse.json({ ok: removed });
}

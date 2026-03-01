import { NextResponse } from "next/server";
import { loadWorkspaceConfigs } from "@/lib/slack/config";
import { getClientForConfig } from "@/lib/slack/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = loadWorkspaceConfigs();

    const results = await Promise.allSettled(
      configs.map(async (config) => {
        const client = getClientForConfig(config);
        const auth = await client.auth.test();
        return {
          id: config.id,
          teamId: config.teamId,
          name: config.teamName,
          color: config.color,
          connected: true,
          user: auth.user,
        };
      })
    );

    const workspaces = results.map((result, i) => {
      const config = configs[i];
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        id: config.id,
        teamId: config.teamId,
        name: config.teamName,
        color: config.color,
        connected: false,
        error: String(result.reason),
      };
    });

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Workspace fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces", details: String(error) },
      { status: 500 }
    );
  }
}

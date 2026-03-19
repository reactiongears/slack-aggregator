import { NextResponse } from "next/server";
import { loadWorkspaceConfigs } from "@/lib/slack/config";
import { getClientForConfig } from "@/lib/slack/client";

export const dynamic = "force-dynamic";

// Cache workspace icons in memory (they rarely change)
const iconCache = new Map<string, string>();

export async function GET() {
  try {
    const configs = loadWorkspaceConfigs();

    const results = await Promise.allSettled(
      configs.map(async (config) => {
        const client = getClientForConfig(config);
        const auth = await client.auth.test();

        // Fetch team icon if not cached
        let icon = iconCache.get(config.teamId);
        if (!icon) {
          try {
            const teamInfo = await client.team.info({ team: config.teamId });
            const teamIcon = (teamInfo.team as Record<string, unknown>)?.icon as Record<string, string> | undefined;
            icon = teamIcon?.image_44 || teamIcon?.image_34 || teamIcon?.image_68 || "";
            if (icon) iconCache.set(config.teamId, icon);
          } catch {
            // team.info may fail for guest accounts
          }
        }

        return {
          id: config.id,
          teamId: config.teamId,
          name: config.teamName,
          color: config.color,
          icon: icon || "",
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
        icon: iconCache.get(config.teamId) || "",
        connected: false,
        error: String(result.reason),
      };
    });

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Workspace fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces", details: String(error) },
      { status: 500 },
    );
  }
}

import { WorkspaceConfig } from "./types";

const WORKSPACE_COLORS: Record<string, string> = {
  mediabuyer: "#3B82F6",    // Blue
  salesmade: "#22C55E",     // Green
  techstyle: "#A855F7",     // Purple
  reactiongears: "#F97316", // Orange
  teamsmartfix: "#EF4444",  // Red
};

export function loadWorkspaceConfigs(): WorkspaceConfig[] {
  const workspaceIds = (process.env.SLACK_WORKSPACES ?? "").split(",").filter(Boolean);

  // Legacy global cookie — new installs use per-workspace cookies only
  const globalCookie = process.env.SLACK_COOKIE_D ?? "";

  return workspaceIds.map((id) => {
    const key = id.trim().toUpperCase();
    const token = process.env[`SLACK_TOKEN_${key}`];
    const teamId = process.env[`SLACK_TEAM_ID_${key}`];
    const teamName = process.env[`SLACK_TEAM_NAME_${key}`];
    const teamDomain = process.env[`SLACK_TEAM_DOMAIN_${key}`];
    // Per-workspace cookie override, or fall back to global
    const cookie = process.env[`SLACK_COOKIE_D_${key}`] || globalCookie;

    if (!token || !teamId || !teamName || !teamDomain) {
      console.warn(`Missing config for workspace "${id}" — skipping`);
      return null;
    }

    if (!cookie && token.startsWith("xoxc-")) {
      console.warn(`Workspace "${id}" uses xoxc- token but no SLACK_COOKIE_D set — will fail auth`);
    }

    return {
      id: id.trim().toLowerCase(),
      teamId,
      teamName,
      teamDomain,
      token,
      cookie,
      color: WORKSPACE_COLORS[id.trim().toLowerCase()] ?? "#6B7280",
    };
  }).filter((c): c is WorkspaceConfig => c !== null);
}

import puppeteer, { Browser } from "puppeteer-core";
import * as fs from "fs";
import * as path from "path";

export interface DiscoveredWorkspace {
  id: string;
  teamId: string;
  name: string;
  domain: string;
  token: string;
}

export interface AuthResult {
  cookie: string;
  workspaces: DiscoveredWorkspace[];
}

function findChrome(): string {
  const paths = [
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    "Chrome not found. Install Google Chrome and try again."
  );
}

export async function launchSlackAuth(): Promise<AuthResult> {
  const chromePath = findChrome();

  const browser: Browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    defaultViewport: { width: 460, height: 700 },
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--window-size=460,700",
      "--window-position=100,100",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--exclude-switches=enable-automation",
    ],
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  // Collect workspace tokens from Slack's boot API responses as the page loads.
  // This is more reliable than scraping localStorage.
  const interceptedTeams = new Map<string, DiscoveredWorkspace>();

  page.on("response", async (response) => {
    try {
      const url = response.url();
      // Slack's client boot and auth endpoints return team/token data
      if (
        (url.includes("/api/client.boot") ||
          url.includes("/api/client.counts") ||
          url.includes("/api/auth.findTeams")) &&
        response.status() === 200
      ) {
        const json = await response.json();
        // client.boot returns team info with token
        if (json.ok && json.self && json.team) {
          const team = json.team;
          const id = (team.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 20);
          if (id && json.token_type === "xoxc" && team.id) {
            interceptedTeams.set(team.id, {
              id,
              teamId: team.id,
              name: team.name || "",
              domain: team.domain || "",
              token: json.api_token || "",
            });
          }
        }
      }
    } catch {
      // Response parsing may fail — ignore
    }
  });

  await page.goto("https://slack.com/signin#/signin", {
    waitUntil: "domcontentloaded",
  });

  // Poll for login completion by checking for the "d" cookie on .slack.com
  const deadline = Date.now() + 300_000; // 5 minute timeout
  let dCookie: { name: string; value: string } | undefined;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));

    try {
      const [c1, c2] = await Promise.all([
        page.cookies("https://slack.com"),
        page.cookies("https://app.slack.com"),
      ]);
      const cookies = [...c1, ...c2];
      dCookie = cookies.find(
        (c) => c.name === "d" && c.value.startsWith("xoxd-")
      );
      if (dCookie) break;
    } catch {
      break;
    }
  }

  if (!dCookie) {
    try { await browser.close(); } catch {}
    throw new Error("Login timed out. Try again.");
  }

  // Navigate to app.slack.com to trigger client boot (populates tokens via network interception)
  const currentUrl = page.url();
  if (!currentUrl.includes("app.slack.com")) {
    try {
      await page.goto("https://app.slack.com/client", {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
    } catch {
      // timeout is OK — boot API may have already fired
    }
  }

  // Wait for network interception to capture team data, and poll localStorage as fallback
  let teams: DiscoveredWorkspace[] = [];
  const discoveryDeadline = Date.now() + 45_000; // 45s to find workspaces

  while (Date.now() < discoveryDeadline) {
    // Check intercepted network data first
    if (interceptedTeams.size > 0) {
      teams = [...interceptedTeams.values()].filter((t) => t.token && t.teamId);
      if (teams.length > 0) break;
    }

    // Fallback: try localStorage
    try {
      const lsTeams = await page.evaluate(() => {
        try {
          // Try localConfig_v2 (standard Slack storage)
          const raw = localStorage.getItem("localConfig_v2");
          if (!raw) return [];
          const config = JSON.parse(raw);
          if (!config.teams) return [];
          const entries = Object.values(config.teams) as any[];
          const valid = entries.filter((t: any) => t.token && t.id);
          if (valid.length === 0) return [];
          return valid.map((t: any) => ({
            id: (t.name || "")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 20),
            teamId: t.id || "",
            name: t.name || "",
            domain: t.domain || "",
            token: t.token || "",
          }));
        } catch {
          return [];
        }
      });
      if (lsTeams.length > 0) {
        teams = lsTeams;
        break;
      }
    } catch {
      // page context destroyed — rely on intercepted data
      if (interceptedTeams.size > 0) {
        teams = [...interceptedTeams.values()].filter((t) => t.token && t.teamId);
      }
      break;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  try { await browser.close(); } catch {}

  if (teams.length === 0) {
    throw new Error(
      "Logged in but could not read workspace data. Try signing into a workspace first."
    );
  }

  return {
    cookie: dCookie.value,
    workspaces: teams,
  };
}

const COLORS = [
  "#3B82F6", "#22C55E", "#A855F7", "#F97316", "#EF4444",
  "#EC4899", "#14B8A6", "#F59E0B", "#6366F1", "#8B5CF6",
];

export function saveWorkspacesToEnv(
  cookie: string,
  workspaces: DiscoveredWorkspace[]
): void {
  const projectDir = process.cwd();
  const envPath = path.join(projectDir, ".env.local");

  // Read existing env to preserve config for workspaces not in this login session
  let existing = "";
  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf-8");
  }

  // Parse existing workspace list and build a teamId → id lookup
  const existingWsMatch = existing.match(/^SLACK_WORKSPACES=(.*)$/m);
  const existingIds = existingWsMatch
    ? existingWsMatch[1].split(",").filter(Boolean)
    : [];

  const existingTeamIdToKey = new Map<string, string>();
  for (const id of existingIds) {
    const key = id.toUpperCase();
    const teamIdMatch = existing.match(
      new RegExp(`^SLACK_TEAM_ID_${key}=(.*)$`, "m")
    );
    if (teamIdMatch) {
      existingTeamIdToKey.set(teamIdMatch[1], id);
    }
  }

  // For each new workspace, if it matches an existing one by teamId,
  // reuse the existing key so we update in place instead of duplicating
  for (const ws of workspaces) {
    const existingKey = existingTeamIdToKey.get(ws.teamId);
    if (existingKey) {
      ws.id = existingKey;
    }
  }

  // Build set of IDs from the new login — these get fresh tokens
  const newIds = new Set(workspaces.map((w) => w.id));

  // Merge: keep existing, add new ones
  const allIds = [...existingIds];
  for (const ws of workspaces) {
    if (!allIds.includes(ws.id)) {
      allIds.push(ws.id);
    }
  }

  // Build new env content — each workspace gets its own cookie
  // so separate OAuth sessions (e.g. TechStyle vs MediaBuyer) don't clobber each other
  let env = `# Slack Notification Aggregator - Configuration\n`;
  env += `# Auto-generated. Edit manually or run setup again.\n\n`;
  env += `SLACK_WORKSPACES=${allIds.join(",")}\n`;

  // For existing workspaces NOT in the new login set, preserve their config + cookie
  for (const id of existingIds) {
    if (newIds.has(id)) continue; // will be written with fresh tokens below
    const key = id.toUpperCase();

    const tokenMatch = existing.match(
      new RegExp(`^SLACK_TOKEN_${key}=(.*)$`, "m")
    );
    const teamIdMatch = existing.match(
      new RegExp(`^SLACK_TEAM_ID_${key}=(.*)$`, "m")
    );
    const nameMatch = existing.match(
      new RegExp(`^SLACK_TEAM_NAME_${key}=(.*)$`, "m")
    );
    const domainMatch = existing.match(
      new RegExp(`^SLACK_TEAM_DOMAIN_${key}=(.*)$`, "m")
    );
    // Preserve this workspace's existing cookie
    const cookieMatch = existing.match(
      new RegExp(`^SLACK_COOKIE_D_${key}=(.*)$`, "m")
    );
    // Fall back to old global cookie if no per-workspace cookie existed
    const oldGlobalMatch = existing.match(/^SLACK_COOKIE_D=(.+)$/m);
    const wsCookie = cookieMatch?.[1] || oldGlobalMatch?.[1] || "";

    if (tokenMatch && teamIdMatch && nameMatch && domainMatch) {
      env += `\n# ${nameMatch[1]}\n`;
      env += `SLACK_TOKEN_${key}=${tokenMatch[1]}\n`;
      env += `SLACK_TEAM_ID_${key}=${teamIdMatch[1]}\n`;
      env += `SLACK_TEAM_NAME_${key}=${nameMatch[1]}\n`;
      env += `SLACK_TEAM_DOMAIN_${key}=${domainMatch[1]}\n`;
      if (wsCookie) {
        env += `SLACK_COOKIE_D_${key}=${wsCookie}\n`;
      }
    }
  }

  // Write all workspaces from the new login with fresh tokens + fresh cookie
  for (const ws of workspaces) {
    const key = ws.id.toUpperCase();
    env += `\n# ${ws.name}\n`;
    env += `SLACK_TOKEN_${key}=${ws.token}\n`;
    env += `SLACK_TEAM_ID_${key}=${ws.teamId}\n`;
    env += `SLACK_TEAM_NAME_${key}=${ws.name}\n`;
    env += `SLACK_TEAM_DOMAIN_${key}=${ws.domain}\n`;
    env += `SLACK_COOKIE_D_${key}=${cookie}\n`;
  }

  fs.writeFileSync(envPath, env);

  // Update process.env so the running server picks up changes immediately
  delete process.env.SLACK_COOKIE_D; // no longer used — per-workspace only
  process.env.SLACK_WORKSPACES = allIds.join(",");

  // Set per-workspace cookies for workspaces from this login
  for (const ws of workspaces) {
    const key = ws.id.toUpperCase();
    process.env[`SLACK_TOKEN_${key}`] = ws.token;
    process.env[`SLACK_TEAM_ID_${key}`] = ws.teamId;
    process.env[`SLACK_TEAM_NAME_${key}`] = ws.name;
    process.env[`SLACK_TEAM_DOMAIN_${key}`] = ws.domain;
    process.env[`SLACK_COOKIE_D_${key}`] = cookie;
  }
}

/**
 * Update the per-workspace cookie for a single workspace (used by auto-refresh).
 */
export function updateWorkspaceCookie(workspaceId: string, freshCookie: string): void {
  const key = workspaceId.toUpperCase();
  const projectDir = process.cwd();
  const envPath = path.join(projectDir, ".env.local");

  // Update process.env immediately
  process.env[`SLACK_COOKIE_D_${key}`] = freshCookie;

  // Update the .env.local file
  if (!fs.existsSync(envPath)) return;
  let content = fs.readFileSync(envPath, "utf-8");

  const cookieRegex = new RegExp(`^SLACK_COOKIE_D_${key}=.*$`, "m");
  if (cookieRegex.test(content)) {
    content = content.replace(cookieRegex, `SLACK_COOKIE_D_${key}=${freshCookie}`);
  } else {
    // Append after the last line of this workspace's config
    const domainRegex = new RegExp(`^(SLACK_TEAM_DOMAIN_${key}=.*)$`, "m");
    content = content.replace(domainRegex, `$1\nSLACK_COOKIE_D_${key}=${freshCookie}`);
  }

  fs.writeFileSync(envPath, content);
}

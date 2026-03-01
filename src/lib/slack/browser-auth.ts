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
    args: [
      "--window-size=460,700",
      "--window-position=100,100",
      "--disable-extensions",
      "--no-first-run",
    ],
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  await page.goto("https://slack.com/signin#/signin", {
    waitUntil: "networkidle2",
  });

  // Poll for login completion by checking for the "d" cookie on .slack.com
  // This works regardless of which URL Slack redirects to after login.
  // Timeout after 5 minutes.
  const deadline = Date.now() + 300_000;
  let dCookie: { name: string; value: string } | undefined;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));

    try {
      // Check cookies across Slack domains
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
      // Browser might have been closed by user
      break;
    }
  }

  if (!dCookie) {
    try { await browser.close(); } catch {}
    throw new Error("Login timed out. Try again.");
  }

  // Navigate to app.slack.com to populate localStorage with team data
  const currentUrl = page.url();
  const isOnApp = currentUrl.includes("app.slack.com");
  if (!isOnApp) {
    try {
      await page.goto("https://app.slack.com", {
        waitUntil: "networkidle2",
        timeout: 30_000,
      });
    } catch {
      // May timeout but localStorage might already be populated
    }
  }

  // Wait for localStorage to populate
  await new Promise((r) => setTimeout(r, 3000));

  // Extract workspace data from localStorage
  let teams: DiscoveredWorkspace[] = [];
  try {
    teams = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("localConfig_v2");
        if (!raw) return [];
        const config = JSON.parse(raw);
        if (!config.teams) return [];
        return Object.values(config.teams).map((t: any) => ({
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
  } catch {
    // page context may have been destroyed
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

  // Read existing env to preserve any manual entries
  let existing = "";
  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf-8");
  }

  // Parse existing workspace list
  const existingWsMatch = existing.match(/^SLACK_WORKSPACES=(.*)$/m);
  const existingIds = existingWsMatch
    ? existingWsMatch[1].split(",").filter(Boolean)
    : [];

  // Merge: keep existing, add new ones
  const allIds = [...existingIds];
  for (const ws of workspaces) {
    if (!allIds.includes(ws.id)) {
      allIds.push(ws.id);
    }
  }

  // Preserve existing global cookie — new workspaces get per-workspace cookies
  const existingCookieMatch = existing.match(/^SLACK_COOKIE_D=(.+)$/m);
  const existingGlobalCookie = existingCookieMatch?.[1] || "";
  const globalCookie = existingGlobalCookie || cookie;

  // Build new env content
  let env = `# Slack Notification Aggregator - Configuration\n`;
  env += `# Auto-generated. Edit manually or run setup again.\n\n`;
  env += `SLACK_COOKIE_D=${globalCookie}\n\n`;
  env += `SLACK_WORKSPACES=${allIds.join(",")}\n`;

  // For existing workspaces not in the new set, preserve their config from existing env
  for (const id of existingIds) {
    const key = id.toUpperCase();
    const isNew = workspaces.find((w) => w.id === id);
    if (!isNew) {
      // Preserve existing config
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
      const wsCookieMatch = existing.match(
        new RegExp(`^SLACK_COOKIE_D_${key}=(.*)$`, "m")
      );

      if (tokenMatch && teamIdMatch && nameMatch && domainMatch) {
        env += `\n# ${nameMatch[1]}\n`;
        env += `SLACK_TOKEN_${key}=${tokenMatch[1]}\n`;
        env += `SLACK_TEAM_ID_${key}=${teamIdMatch[1]}\n`;
        env += `SLACK_TEAM_NAME_${key}=${nameMatch[1]}\n`;
        env += `SLACK_TEAM_DOMAIN_${key}=${domainMatch[1]}\n`;
        if (wsCookieMatch) {
          env += `SLACK_COOKIE_D_${key}=${wsCookieMatch[1]}\n`;
        }
      }
    }
  }

  // Write new workspaces — use per-workspace cookie if different from global
  const needsPerWsCookie = cookie !== globalCookie;
  for (const ws of workspaces) {
    const key = ws.id.toUpperCase();
    env += `\n# ${ws.name}\n`;
    env += `SLACK_TOKEN_${key}=${ws.token}\n`;
    env += `SLACK_TEAM_ID_${key}=${ws.teamId}\n`;
    env += `SLACK_TEAM_NAME_${key}=${ws.name}\n`;
    env += `SLACK_TEAM_DOMAIN_${key}=${ws.domain}\n`;
    if (needsPerWsCookie) {
      env += `SLACK_COOKIE_D_${key}=${cookie}\n`;
    }
  }

  fs.writeFileSync(envPath, env);

  // Update process.env so the running server picks up changes immediately
  // Keep original global cookie intact
  if (!existingGlobalCookie) {
    process.env.SLACK_COOKIE_D = cookie;
  }
  process.env.SLACK_WORKSPACES = allIds.join(",");
  for (const ws of workspaces) {
    const key = ws.id.toUpperCase();
    process.env[`SLACK_TOKEN_${key}`] = ws.token;
    process.env[`SLACK_TEAM_ID_${key}`] = ws.teamId;
    process.env[`SLACK_TEAM_NAME_${key}`] = ws.name;
    process.env[`SLACK_TEAM_DOMAIN_${key}`] = ws.domain;
    if (needsPerWsCookie) {
      process.env[`SLACK_COOKIE_D_${key}`] = cookie;
    }
  }
}

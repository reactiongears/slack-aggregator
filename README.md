# Slack Aggregator

A unified notification feed for all your Slack workspaces. See unread messages from every workspace in one chronological view, and click any notification to jump straight to it in Slack.

![Built with Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## The Problem

If you're in multiple Slack workspaces, you know the pain: constantly clicking between collapsed workspaces in the sidebar, missing important messages, and losing track of conversations across teams.

## The Solution

Slack Aggregator runs locally on your machine and gives you:

- **Unified feed** — All unread messages from every workspace in one chronological list
- **One-click deep linking** — Click any message to open it directly in Slack desktop
- **Smart filtering** — Filter by workspace, mentions, DMs, or channels
- **Search** — Find messages across all workspaces instantly
- **Right-click actions** — Mark as read, ignore noisy users or channels
- **Browser notifications** — Tab badge shows your total unread count
- **Add workspaces from the UI** — Click "+ Add Workspace" and sign in through Chrome, no manual token copying
- **Privacy first** — Runs 100% locally, your tokens never leave your machine

## Quick Start

### Prerequisites

- **Node.js 18+** ([download](https://nodejs.org))
- **Google Chrome** (for the browser-based workspace setup)

### Install

```bash
git clone https://github.com/reactiongears/slack-aggregator.git
cd slack-aggregator
bash install.sh
```

The install script will:
1. Install dependencies
2. Walk you through connecting your Slack workspaces
3. Create a terminal command to launch the app

### Manual Setup

If you prefer to set things up manually:

```bash
npm install
npm run setup
# Or configure .env.local by hand (see "Getting Your Tokens" below)
npm run dev
```

## Getting Your Tokens

Slack Aggregator uses your existing browser session — **no Slack app creation needed**.

### Step 1: Get Your Cookie

1. Open [app.slack.com](https://app.slack.com) in your browser
2. Open DevTools (`Cmd+Option+I` on Mac, `F12` on Windows)
3. Go to **Application** tab > **Cookies** > `https://app.slack.com`
4. Find the cookie named **`d`** — copy its value (starts with `xoxd-`)

### Step 2: Get Your Workspace Tokens

In the same browser, open the **Console** tab and run:

```js
JSON.parse(localStorage.getItem("localConfig_v2")).teams
```

This shows all your workspaces. For each one, note:
- **`id`** — Team ID (starts with `T`)
- **`name`** — Workspace name
- **`domain`** — The `.slack.com` subdomain
- **`token`** — Session token (starts with `xoxc-`)

### Step 3: Configure

Add your tokens to `.env.local`:

```env
SLACK_COOKIE_D=xoxd-your-cookie-here

SLACK_WORKSPACES=mycompany,otherteam

SLACK_TOKEN_MYCOMPANY=xoxc-...
SLACK_TEAM_ID_MYCOMPANY=T...
SLACK_TEAM_NAME_MYCOMPANY=My Company
SLACK_TEAM_DOMAIN_MYCOMPANY=mycompany

SLACK_TOKEN_OTHERTEAM=xoxc-...
SLACK_TEAM_ID_OTHERTEAM=T...
SLACK_TEAM_NAME_OTHERTEAM=Other Team
SLACK_TEAM_DOMAIN_OTHERTEAM=otherteam
```

### Or: Add Workspaces from the UI

Once the app is running, click **"+ Add Workspace"** in the sidebar. A Chrome window will open to Slack's sign-in page — just log in and the app detects your tokens automatically.

## Usage

```bash
# If you set up the terminal alias during install:
slack

# Or run directly:
npm run dev
```

The app opens in your browser. From there:

- **Click** any message to open it in Slack desktop
- **Right-click** a message to mark as read, ignore a user, or ignore a channel
- **Filter** by workspace, type (mentions/DMs/channels), or search
- **Manage ignored** users and channels from the "Ignored" button in the sidebar

## How It Works

- Runs as a local Next.js app on your machine
- Uses Slack's Web API with your existing browser session tokens
- Fetches the 5 most recent unread messages per channel
- Caches user profiles in a local SQLite database
- Polls for new messages every 30 seconds
- All data stays on your machine — nothing is sent to any server except Slack's API

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS 4**
- **SWR** for data fetching
- **better-sqlite3** for local caching
- **@slack/web-api** for Slack API calls
- **puppeteer-core** for browser-based workspace setup

## Project Structure

```
src/
  app/
    api/
      feed/         — Main feed endpoint
      auth/         — Browser-based workspace setup
      ignores/      — Ignore list management
      mark-read/    — Mark messages as read
  components/
    feed/           — Feed items, context menu, skeletons
    sidebar/        — Workspace list, ignore panel, add workspace modal
    header/         — Search bar, refresh, unread count
    ui/             — Shared UI components
  hooks/
    useFeed.ts      — SWR hook for feed data
    useFavicon.ts   — Dynamic favicon with unread badge
  lib/
    slack/          — Slack API client, fetcher, config, auth
    cache/          — SQLite caching (users, channels)
    utils/          — Time formatting, emoji conversion
```

## Token Renewal

Session tokens (`xoxc-`) expire when you log out of Slack in your browser or when Slack rotates them. If you see `invalid_auth` errors:

1. Open [app.slack.com](https://app.slack.com) in your browser
2. Use the "+ Add Workspace" button in the app to re-authenticate, or
3. Re-run `npm run setup` to update tokens manually

## Contributing

Contributions are welcome! Here are some ideas:

- **Desktop app wrapper** (Electron/Tauri) for a native experience
- **System notifications** for new messages
- **Thread support** — expand and view thread replies
- **Message reactions** display
- **Custom workspace emoji** support
- **Multiple theme options**
- **Token auto-refresh** mechanism
- **Mark entire channel as read** from the context menu

Feel free to open an issue to discuss ideas or submit a pull request. All contributions, big or small, are appreciated.

## License

MIT

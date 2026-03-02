<p align="center">
  <img src="public/icon-512.png" width="128" height="128" alt="Slack Aggregator icon" />
</p>

<h1 align="center">Slack Aggregator</h1>

<p align="center">A unified notification feed for all your Slack workspaces. See unread messages from every workspace in one chronological view, and click any notification to jump straight to it in Slack.</p>

![Built with Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## The Problem

If you're in multiple Slack workspaces, you know the pain: constantly clicking between collapsed workspaces in the sidebar, missing important messages, and losing track of conversations across teams.

## The Solution

Slack Aggregator runs locally on your machine and gives you:

- **Unified feed** — All unread messages from every workspace in one chronological list
- **One-click deep linking** — Click any message to open it directly in Slack desktop
- **Quick reply** — Reply to messages without leaving the app
- **Emoji reactions** — React to any message with one click
- **Smart filtering** — Filter by workspace, mentions, DMs, or channels
- **Search** — Find messages across all workspaces instantly
- **Right-click actions** — Mark as read, ignore noisy users or channels
- **Browser notifications** — Tab badge shows your total unread count
- **Rich mentions** — @mentions, @here, @channel, and user groups styled like Slack
- **Privacy first** — Runs 100% locally, your tokens never leave your machine

## Install

### macOS

1. Clone the repo:
   ```bash
   git clone https://github.com/reactiongears/slack-aggregator.git
   ```
2. Open the `slack-aggregator` folder in Finder
3. Double-click **`Install Slack Aggregator.app`** — the installer handles everything:
   - Checks for Node.js (offers to install via Homebrew if missing)
   - Installs dependencies
   - Builds the production app
   - Creates **Slack Aggregator.app**
4. Drag **Slack Aggregator** into **Applications** in the drag-to-install window
5. Open it from Applications, Spotlight, or your Dock

> **Note:** The full repo is required — the installer builds the app from source locally. A standalone download is not available.

**Updating:** `git pull` in the project folder and double-click the installer again.

**Optional:** Add to Login Items (System Settings > General > Login Items) to launch on startup.

### Windows

Requires **Node.js 18+** ([download](https://nodejs.org)) and **Google Chrome**.

```bash
git clone https://github.com/reactiongears/slack-aggregator.git
cd slack-aggregator
npm install
npm run build
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

For day-to-day use you can just run:
```bash
npm start
```

### Development Mode

On any platform, to run with hot-reload for development:

```bash
npm run dev
```

## First-Time Setup

The app opens in your browser and walks you through adding your first workspace — click **"Add Workspace"**, sign in to Slack in the browser window that opens, and you're done. No manual token copying needed.

## Usage

- **Click** any message to quick reply, react with an emoji, or open it in Slack desktop
- **Right-click** a message to mark as read, ignore a user, or ignore a channel
- **Filter** by workspace, type (mentions/DMs/channels), or search
- **Manage ignored** users and channels from the "Ignored" button in the sidebar
- **Add more workspaces** anytime with the "+ Add Workspace" button

## How It Works

- Runs as a local Next.js app on your machine
- Uses Slack's Web API with your existing browser session tokens
- Fetches the 5 most recent unread messages per channel
- Caches user profiles in a local SQLite database
- Caches feed responses for 30 seconds to avoid rate limits on browser refresh
- Polls for new messages every 30 seconds
- All data stays on your machine — nothing is sent to any server except Slack's API

## Token Renewal

Session tokens expire when you log out of Slack in your browser or when Slack rotates them. If you see `invalid_auth` errors, just click "+ Add Workspace" in the sidebar to re-authenticate the affected workspace.

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS 4**
- **SWR** for data fetching
- **better-sqlite3** for local caching
- **@slack/web-api** for Slack API calls
- **puppeteer-core** for browser-based workspace setup

## Contributing

Contributions are welcome! Here are some ideas:

- **System notifications** for new messages
- **Thread support** — expand and view thread replies
- **Custom workspace emoji** support
- **Multiple theme options**
- **Token auto-refresh** mechanism
- **Mark entire channel as read** from the context menu

Feel free to open an issue to discuss ideas or submit a pull request.

## License

MIT

# Slack Aggregator

A unified notification feed for all your Slack workspaces. See unread messages from every workspace in one chronological view, and click any notification to jump straight to it in Slack.

![Built with Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## The Problem

If you're in multiple Slack workspaces, you know the pain: constantly clicking between collapsed workspaces in the sidebar, missing important messages, and losing track of conversations across teams.

## The Solution

Slack Aggregator runs locally on your machine and gives you:

- **Unified feed** — All unread messages from every workspace in one chronological list
- **One-click deep linking** — Click any message to open it directly in Slack desktop
- **Quick reply** — Reply to messages without leaving the app
- **Smart filtering** — Filter by workspace, mentions, DMs, or channels
- **Search** — Find messages across all workspaces instantly
- **Right-click actions** — Mark as read, ignore noisy users or channels
- **Browser notifications** — Tab badge shows your total unread count
- **Rich mentions** — @mentions, @here, @channel, and user groups styled like Slack
- **Privacy first** — Runs 100% locally, your tokens never leave your machine

## Quick Start

### Prerequisites

- **Node.js 18+** ([download](https://nodejs.org))
- **Google Chrome** (for the browser-based workspace login)

### Install & Run

```bash
git clone https://github.com/reactiongears/slack-aggregator.git
cd slack-aggregator
npm install
npm run dev
```

That's it. The app opens in your browser and walks you through adding your first workspace — just click **"Add Workspace"**, sign in to Slack in the browser window that opens, and you're done. No manual token copying needed.

### Optional: Terminal Shortcut

To launch the app from any terminal with a single command:

```bash
bash install.sh
```

This installs dependencies and creates a terminal command (e.g. `slack`) so you can start the app from anywhere.

## Usage

- **Click** any message to quick reply or open it in Slack desktop
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

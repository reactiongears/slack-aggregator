#!/bin/bash
# Slack Aggregator — single-command launcher
# Starts the production server (if not running) and opens the app window.
# No terminal stays open.

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

# Ensure tools are in PATH (the .app bundle can't use a login shell
# because Finder launches with a broken cwd that crashes Volta/brew).
if [ -f /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi
export VOLTA_HOME="${VOLTA_HOME:-$HOME/.volta}"
[ -d "$VOLTA_HOME/bin" ] && export PATH="$VOLTA_HOME/bin:$PATH"
# nvm — add node binary to PATH directly (sourcing nvm.sh conflicts with Volta's .npmrc)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -d "$NVM_DIR/versions/node" ]; then
  NVM_NODE=$(ls -d "$NVM_DIR/versions/node"/v* 2>/dev/null | sort -V | tail -1)
  [ -n "$NVM_NODE" ] && export PATH="$NVM_NODE/bin:$PATH"
fi
PORT=3147  # Fixed port so PWA bookmark always works
PIDFILE="$DIR/.slack-aggregator.pid"
LOGFILE="$DIR/.slack-aggregator.log"

bold="\033[1m"
green="\033[32m"
dim="\033[2m"
reset="\033[0m"

is_running() {
  if [ -f "$PIDFILE" ]; then
    local pid=$(cat "$PIDFILE" 2>/dev/null)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$PIDFILE"
  fi
  # Also check if something is listening on the port
  if lsof -i ":$PORT" -sTCP:LISTEN &>/dev/null; then
    return 0
  fi
  return 1
}

# Handle "stop" argument
if [ "${1:-}" = "stop" ]; then
  # Kill the watcher if running
  WATCHER_PIDFILE="$DIR/.slack-aggregator-watcher.pid"
  if [ -f "$WATCHER_PIDFILE" ]; then
    wpid=$(cat "$WATCHER_PIDFILE" 2>/dev/null)
    [ -n "$wpid" ] && kill "$wpid" 2>/dev/null
    rm -f "$WATCHER_PIDFILE"
  fi
  if [ -f "$PIDFILE" ]; then
    pid=$(cat "$PIDFILE" 2>/dev/null)
    if [ -n "$pid" ] && kill "$pid" 2>/dev/null; then
      echo -e "  ${green}✓${reset} Stopped Slack Aggregator (pid $pid)"
      rm -f "$PIDFILE"
      exit 0
    fi
  fi
  echo "  Slack Aggregator is not running."
  exit 0
fi

# Handle "status" argument
if [ "${1:-}" = "status" ]; then
  if is_running; then
    echo -e "  ${green}●${reset} Slack Aggregator is running on http://localhost:$PORT"
  else
    echo -e "  ${dim}○${reset} Slack Aggregator is not running"
  fi
  exit 0
fi

# If already running, just open the window
if is_running; then
  echo -e "  ${green}●${reset} Already running on port $PORT"
  if [ -d "/Applications/Google Chrome.app" ]; then
    osascript -e "do shell script \"/Applications/Google\\\\ Chrome.app/Contents/MacOS/Google\\\\ Chrome --app=http://localhost:$PORT --window-size=1200,800 &> /dev/null &\""
  else
    open "http://localhost:$PORT" 2>/dev/null
  fi
  exit 0
fi

# Build if needed (no .next/BUILD_ID means never built, or stale)
if [ ! -f "$DIR/.next/BUILD_ID" ]; then
  echo -e "  ${dim}Building...${reset}"
  (cd "$DIR" && npm run build --silent 2>&1)
  echo -e "  ${green}✓${reset} Built"
fi

# Start production server in background (detached from terminal)
echo -e "  ${dim}Starting server...${reset}"
cd "$DIR"
nohup node_modules/.bin/next start -p "$PORT" > "$LOGFILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PIDFILE"

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
  echo "  Failed to start. Check $LOGFILE"
  exit 1
fi

echo -e "  ${green}✓${reset} Running on http://localhost:$PORT (pid $SERVER_PID)"

# Open in Chrome as a standalone app window (no URL bar)
# Use osascript to launch Chrome with --app flag reliably (even when Chrome is already running)
APP_URL="http://localhost:$PORT"
if [ -d "/Applications/Google Chrome.app" ]; then
  osascript -e "do shell script \"/Applications/Google\\\\ Chrome.app/Contents/MacOS/Google\\\\ Chrome --app=$APP_URL --window-size=1200,800 &> /dev/null &\""
else
  open "$APP_URL" 2>/dev/null
fi

# Background watcher: kills the server when the Chrome app window closes.
# Chrome --app windows don't appear in AppleScript tab enumeration,
# so we check for the Chrome process with our --app URL instead.
# Detached from the terminal so it survives the launcher exiting.
(
  sleep 5  # give Chrome time to open the window
  while true; do
    # Check if any Chrome process is running with our app URL
    # (pgrep truncates args on macOS, so use ps + grep instead)
    if ! ps -eo command | grep -q "[a]pp=http://localhost:$PORT"; then
      # Window is gone — stop the server
      if [ -f "$PIDFILE" ]; then
        pid=$(cat "$PIDFILE" 2>/dev/null)
        if [ -n "$pid" ] && kill "$pid" 2>/dev/null; then
          rm -f "$PIDFILE"
        fi
      fi
      exit 0
    fi
    sleep 3
  done
) &>/dev/null &
WATCHER_PID=$!
# Save watcher PID so "stop" can clean it up too
echo "$WATCHER_PID" > "$DIR/.slack-aggregator-watcher.pid"

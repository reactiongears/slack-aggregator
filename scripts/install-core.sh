#!/bin/bash
# ============================================================
# Slack Aggregator — Installer (core logic)
# Called by "Install Slack Aggregator.command" in a clean shell.
# ============================================================

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

bold="\033[1m"
green="\033[32m"
red="\033[31m"
cyan="\033[36m"
dim="\033[2m"
reset="\033[0m"

# Helper: native macOS dialogs
dialog_yesno() {
  osascript -e "display dialog \"$1\" buttons {\"No\", \"Yes\"} default button 2 with title \"Slack Aggregator\" with icon note" 2>/dev/null
}

dialog_error() {
  osascript -e "display dialog \"$1\" buttons {\"OK\"} default button 1 with title \"Slack Aggregator\" with icon stop" 2>/dev/null
}

notify() {
  osascript -e "display notification \"$1\" with title \"Slack Aggregator\"" 2>/dev/null || true
}

# ============================================================
# Welcome
# ============================================================
osascript -e '
display dialog "Welcome to Slack Aggregator!\n\nThis will set up a unified notification feed for all your Slack workspaces.\n\nThe installer will:\n  • Check for Node.js (install if needed)\n  • Install dependencies\n  • Build the production app\n  • Create a launchable app in ~/Applications" buttons {"Cancel", "Install"} default button 2 with title "Slack Aggregator" with icon note
' 2>/dev/null || exit 0

echo ""
echo -e "${bold}  Slack Aggregator — Installer${reset}"
echo -e "${dim}  ──────────────────────────────${reset}"
echo ""

# ============================================================
# Step 1: Check / Install Node.js
# ============================================================
echo -e "  ${dim}Checking Node.js...${reset}"

install_node_brew() {
  echo -e "  ${dim}Installing Node.js via Homebrew...${reset}"
  brew install node
}

install_homebrew_and_node() {
  echo -e "  ${dim}Installing Homebrew...${reset}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add Homebrew to PATH for this session
  if [ -f "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -f "/usr/local/bin/brew" ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi

  install_node_brew
}

if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "  ${green}✓${reset} Node.js $(node -v) found"
  else
    echo -e "  ${red}✗${reset} Node.js $(node -v) is too old (need 18+)"
    RESULT=$(dialog_yesno "Node.js $(node -v) was found but version 18+ is required.\n\nWould you like to upgrade it automatically?") || exit 0
    if echo "$RESULT" | grep -q "Yes"; then
      if command -v brew &>/dev/null; then
        echo -e "  ${dim}Upgrading Node.js via Homebrew...${reset}"
        brew upgrade node
      else
        dialog_error "Please upgrade Node.js manually from https://nodejs.org"
        exit 1
      fi
    else
      exit 0
    fi
  fi
else
  echo -e "  ${dim}Node.js not found${reset}"

  if command -v brew &>/dev/null; then
    RESULT=$(dialog_yesno "Node.js is required but not installed.\n\nHomebrew was detected. Install Node.js via Homebrew?") || exit 0
    if echo "$RESULT" | grep -q "Yes"; then
      install_node_brew
    else
      dialog_error "Node.js 18+ is required.\n\nInstall it from https://nodejs.org and try again."
      exit 1
    fi
  else
    RESULT=$(dialog_yesno "Node.js is required but not installed, and Homebrew was not found.\n\nWould you like to install both Homebrew and Node.js automatically?\n\n(This is the recommended way to manage developer tools on macOS.)") || exit 0
    if echo "$RESULT" | grep -q "Yes"; then
      install_homebrew_and_node
    else
      dialog_error "Node.js 18+ is required.\n\nInstall it from https://nodejs.org and try again."
      exit 1
    fi
  fi

  # Try common Homebrew paths if node isn't in PATH yet
  if ! command -v node &>/dev/null; then
    for p in /opt/homebrew/bin /usr/local/bin; do
      if [ -x "$p/node" ]; then
        export PATH="$p:$PATH"
        break
      fi
    done
  fi

  if ! command -v node &>/dev/null; then
    dialog_error "Node.js installation may have succeeded but it's not in PATH.\n\nPlease close this window, open a new Terminal, and run:\n\nbash install.sh"
    exit 1
  fi

  echo -e "  ${green}✓${reset} Node.js $(node -v) installed"
fi

# ============================================================
# Step 2: Install dependencies
# ============================================================
echo ""
echo -e "  ${dim}Installing dependencies...${reset}"
notify "Installing dependencies..."

npm install

echo -e "  ${green}✓${reset} Dependencies installed"

# ============================================================
# Step 3: Build production app
# ============================================================
echo ""
echo -e "  ${dim}Building production app (this may take a minute)...${reset}"
notify "Building app..."

npm run build

echo -e "  ${green}✓${reset} Production build ready"

# ============================================================
# Step 4: Create .app bundle
# ============================================================
echo ""
echo -e "  ${dim}Creating app bundle...${reset}"

/bin/bash "$DIR/scripts/create-app.sh"

# ============================================================
# Step 5: Create terminal aliases
# ============================================================
echo ""
RESULT=$(dialog_yesno "Would you like to add terminal commands?\n\n  slack — Launch the app\n  slack-stop — Stop the server\n  slack-status — Check status") || true
if echo "$RESULT" | grep -q "Yes"; then
  SHELL_NAME=$(basename "$SHELL")
  if [ "$SHELL_NAME" = "zsh" ]; then
    RCFILE="$HOME/.zshrc"
  elif [ "$SHELL_NAME" = "bash" ]; then
    RCFILE="$HOME/.bash_profile"
    [ ! -f "$RCFILE" ] && RCFILE="$HOME/.bashrc"
  else
    RCFILE="$HOME/.profile"
  fi

  LAUNCH_SCRIPT="$DIR/scripts/launch.sh"
  ALIAS_BLOCK="
# Slack Aggregator
alias slack=\"${LAUNCH_SCRIPT}\"
alias slack-stop=\"${LAUNCH_SCRIPT} stop\"
alias slack-status=\"${LAUNCH_SCRIPT} status\"
"

  if [ -f "$RCFILE" ] && grep -q "# Slack Aggregator" "$RCFILE"; then
    TEMP=$(mktemp)
    awk '/^# Slack Aggregator/{skip=1} skip && /^$/{skip=0;next} !skip' "$RCFILE" > "$TEMP"
    echo "$ALIAS_BLOCK" >> "$TEMP"
    mv "$TEMP" "$RCFILE"
    echo -e "  ${green}✓${reset} Updated aliases in $RCFILE"
  else
    echo "$ALIAS_BLOCK" >> "$RCFILE"
    echo -e "  ${green}✓${reset} Added aliases to $RCFILE"
  fi
fi

# ============================================================
# Done!
# ============================================================
echo ""
echo -e "  ${green}${bold}  ✓ Installation complete!${reset}"
echo ""

RESULT=$(dialog_yesno "Installation complete!\n\nSlack Aggregator.app is in ~/Applications.\nYou can drag it to your Dock for quick access.\n\nLaunch it now?") || true
if echo "$RESULT" | grep -q "Yes"; then
  /bin/bash "$DIR/scripts/launch.sh"
fi

echo -e "  ${dim}You can close this window.${reset}"
echo ""

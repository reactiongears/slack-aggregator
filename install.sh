#!/bin/bash
set -e

bold="\033[1m"
green="\033[32m"
cyan="\033[36m"
dim="\033[2m"
reset="\033[0m"

echo ""
echo -e "${bold}  Slack Aggregator — Install${reset}"
echo -e "${dim}  Unified notifications from all your Slack workspaces${reset}"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "  Node.js is required but not installed."
  echo "  Install it from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "  Node.js 18+ required. Found: $(node -v)"
  exit 1
fi

echo -e "  ${green}✓${reset} Node.js $(node -v)"

# Install dependencies
echo ""
echo -e "  ${dim}Installing dependencies...${reset}"
npm install --silent
echo -e "  ${green}✓${reset} Dependencies installed"

# Create terminal shortcut
echo ""
node scripts/setup.mjs

#!/usr/bin/env node

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(__dirname, "..");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function bold(text) {
  return `\x1b[1m${text}\x1b[0m`;
}
function dim(text) {
  return `\x1b[2m${text}\x1b[0m`;
}
function green(text) {
  return `\x1b[32m${text}\x1b[0m`;
}
function cyan(text) {
  return `\x1b[36m${text}\x1b[0m`;
}

async function main() {
  console.log(bold("\n  Create a terminal shortcut\n"));
  console.log(
    "  This adds a command so you can launch Slack Aggregator from any terminal.\n"
  );

  const aliasName = (
    (await ask("  Command name (default: slack): ")) || "slack"
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  // Detect shell config file
  const shell = process.env.SHELL || "/bin/zsh";
  let rcFile;
  if (shell.includes("zsh")) {
    rcFile = path.join(os.homedir(), ".zshrc");
  } else if (shell.includes("bash")) {
    const bashProfile = path.join(os.homedir(), ".bash_profile");
    rcFile = fs.existsSync(bashProfile)
      ? bashProfile
      : path.join(os.homedir(), ".bashrc");
  } else {
    rcFile = path.join(os.homedir(), ".profile");
  }

  const funcBlock = `
# Slack Aggregator
${aliasName}() {
  local dir="${PROJECT_DIR}"
  local lock="$dir/.next/dev/lock"
  if [ -f "$lock" ]; then
    local lock_pid=$(cat "$lock" 2>/dev/null)
    [ -n "$lock_pid" ] && kill "$lock_pid" 2>/dev/null
    rm -f "$lock"
    sleep 1
  fi
  cd "$dir"
  local port=$(node -e "const s=require('net').createServer();s.listen(0,()=>{console.log(s.address().port);s.close()})")
  echo "Starting Slack Aggregator on port $port..."
  npm run dev -- -p "$port" &
  sleep 2
  open "http://localhost:$port" 2>/dev/null || xdg-open "http://localhost:$port" 2>/dev/null
}
`;

  const rcContent = fs.existsSync(rcFile)
    ? fs.readFileSync(rcFile, "utf-8")
    : "";

  if (rcContent.includes("# Slack Aggregator")) {
    const updated = rcContent.replace(
      /\n# Slack Aggregator\n[\s\S]*?\n}\n/,
      funcBlock
    );
    fs.writeFileSync(rcFile, updated);
    console.log(green(`\n  Updated existing alias in ${rcFile}`));
  } else {
    fs.appendFileSync(rcFile, funcBlock);
    console.log(green(`\n  Added '${aliasName}' command to ${rcFile}`));
  }

  console.log(bold("\n  Done!\n"));
  console.log(`  To start, either:\n`);
  console.log(`    1. Open a new terminal and type ${cyan(aliasName)}`);
  console.log(
    `    2. Run ${cyan(`source ${rcFile}`)} then type ${cyan(aliasName)}`
  );
  console.log(`    3. Or just run ${cyan("npm run dev")} from this directory\n`);
  console.log(
    dim("  When the app opens, click \"Add Workspace\" to connect your Slack accounts.\n")
  );

  rl.close();
}

main().catch((err) => {
  console.error("\n  Setup failed:", err.message);
  rl.close();
  process.exit(1);
});

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
    "  This adds a command to launch Slack Aggregator as a standalone app.\n"
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

  const launchScript = path.join(PROJECT_DIR, "scripts", "launch.sh");

  const funcBlock = `
# Slack Aggregator
alias ${aliasName}="${launchScript}"
alias ${aliasName}-stop="${launchScript} stop"
alias ${aliasName}-status="${launchScript} status"
`;

  const rcContent = fs.existsSync(rcFile)
    ? fs.readFileSync(rcFile, "utf-8")
    : "";

  if (rcContent.includes("# Slack Aggregator")) {
    const updated = rcContent.replace(
      /\n# Slack Aggregator\n[\s\S]*?\n/,
      funcBlock
    );
    fs.writeFileSync(rcFile, updated);
    console.log(green(`\n  Updated existing alias in ${rcFile}`));
  } else {
    fs.appendFileSync(rcFile, funcBlock);
    console.log(green(`\n  Added '${aliasName}' command to ${rcFile}`));
  }

  console.log(bold("\n  Done!\n"));
  console.log(`  Commands:\n`);
  console.log(`    ${cyan(aliasName)}          Launch the app`);
  console.log(`    ${cyan(`${aliasName}-stop`)}     Stop the background server`);
  console.log(`    ${cyan(`${aliasName}-status`)}   Check if it's running`);
  console.log(
    `\n  ${dim(`Run ${cyan(`source ${rcFile}`)} to activate, or open a new terminal.`)}`
  );
  console.log(
    dim("\n  The app opens as a standalone window — no browser tab, no terminal needed.\n")
  );

  rl.close();
}

main().catch((err) => {
  console.error("\n  Setup failed:", err.message);
  rl.close();
  process.exit(1);
});

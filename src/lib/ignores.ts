import * as fs from "fs";
import * as path from "path";

export interface IgnoreEntry {
  type: "user" | "channel";
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  addedAt: number;
}

export interface IgnoreList {
  entries: IgnoreEntry[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const IGNORES_PATH = path.join(DATA_DIR, "ignores.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadIgnores(): IgnoreList {
  ensureDataDir();
  if (!fs.existsSync(IGNORES_PATH)) {
    return { entries: [] };
  }
  try {
    const raw = fs.readFileSync(IGNORES_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { entries: [] };
  }
}

function saveIgnores(list: IgnoreList): void {
  ensureDataDir();
  fs.writeFileSync(IGNORES_PATH, JSON.stringify(list, null, 2));
}

export function addIgnore(entry: Omit<IgnoreEntry, "addedAt">): IgnoreEntry {
  const list = loadIgnores();
  // Avoid duplicates
  const exists = list.entries.find(
    (e) => e.type === entry.type && e.id === entry.id && e.workspaceId === entry.workspaceId
  );
  if (exists) return exists;

  const full: IgnoreEntry = { ...entry, addedAt: Date.now() };
  list.entries.push(full);
  saveIgnores(list);
  return full;
}

export function removeIgnore(type: string, id: string, workspaceId: string): boolean {
  const list = loadIgnores();
  const before = list.entries.length;
  list.entries = list.entries.filter(
    (e) => !(e.type === type && e.id === id && e.workspaceId === workspaceId)
  );
  if (list.entries.length < before) {
    saveIgnores(list);
    return true;
  }
  return false;
}

export function isIgnored(
  userId: string,
  channelId: string,
  workspaceId: string,
  entries: IgnoreEntry[]
): boolean {
  return entries.some(
    (e) =>
      e.workspaceId === workspaceId &&
      ((e.type === "user" && e.id === userId) ||
        (e.type === "channel" && e.id === channelId))
  );
}

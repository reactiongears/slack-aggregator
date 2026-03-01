import { WebClient } from "@slack/web-api";
import { WorkspaceConfig } from "./types";
import { loadWorkspaceConfigs } from "./config";

const clients = new Map<string, WebClient>();

function createClient(config: WorkspaceConfig): WebClient {
  const headers: Record<string, string> = {};

  // xoxc- session tokens require the d cookie for authentication
  if (config.token.startsWith("xoxc-") && config.cookie) {
    headers.cookie = `d=${config.cookie}`;
  }

  return new WebClient(config.token, {
    headers,
  });
}

export function getClient(workspaceId: string): WebClient {
  const existing = clients.get(workspaceId);
  if (existing) return existing;

  const configs = loadWorkspaceConfigs();
  const config = configs.find((c) => c.id === workspaceId);
  if (!config) {
    throw new Error(`No config found for workspace "${workspaceId}"`);
  }

  const client = createClient(config);
  clients.set(workspaceId, client);
  return client;
}

export function getAllClients(): Map<string, WebClient> {
  const configs = loadWorkspaceConfigs();
  for (const config of configs) {
    if (!clients.has(config.id)) {
      clients.set(config.id, createClient(config));
    }
  }
  return clients;
}

export function getClientForConfig(config: WorkspaceConfig): WebClient {
  if (!clients.has(config.id)) {
    clients.set(config.id, createClient(config));
  }
  return clients.get(config.id)!;
}

// Clear cached clients (useful when tokens are refreshed)
export function clearClients(): void {
  clients.clear();
}

import { AutoReply } from "./types";
import { getActiveAutoReplies, hasReplied, logReply } from "./queries";
import { getClient } from "@/lib/slack/client";
import { loadWorkspaceConfigs } from "@/lib/slack/config";
import { getDb } from "@/lib/cache/db";

interface IncomingMessage {
  workspaceId: string;
  channelId: string;
  userId: string; // sender
  messageTs: string;
  text: string;
  isDm: boolean;
}

function mentionsMe(text: string, myUserId: string): boolean {
  return text.includes(`<@${myUserId}>`);
}

function ruleMatches(rule: AutoReply, msg: IncomingMessage, myUserIds: Map<string, string>): boolean {
  // Never reply to our own messages
  const myId = myUserIds.get(msg.workspaceId);
  if (myId && msg.userId === myId) return false;

  switch (rule.scope) {
    case "global":
      // Only reply to @mentions
      return myId ? mentionsMe(msg.text, myId) : false;

    case "workspace":
      if (rule.workspaceId !== msg.workspaceId) return false;
      // Only reply to @mentions
      return myId ? mentionsMe(msg.text, myId) : false;

    case "channel":
      if (rule.workspaceId !== msg.workspaceId || rule.channelId !== msg.channelId) return false;
      // Only reply to @mentions
      return myId ? mentionsMe(msg.text, myId) : false;

    case "dm":
      // Reply to all DMs (optionally scoped to a workspace)
      if (!msg.isDm) return false;
      if (rule.workspaceId && rule.workspaceId !== msg.workspaceId) return false;
      return true;

    case "user":
      // User-scoped: reply to all messages from this person
      if (rule.userId !== msg.userId) return false;
      if (rule.workspaceId && rule.workspaceId !== msg.workspaceId) return false;
      return true;

    default:
      return false;
  }
}

// Cache authenticated user IDs per workspace
const myUserIdCache = new Map<string, string>();

async function getMyUserIds(): Promise<Map<string, string>> {
  if (myUserIdCache.size > 0) return myUserIdCache;

  const configs = loadWorkspaceConfigs();
  for (const config of configs) {
    try {
      const client = getClient(config.id);
      const auth = await client.auth.test();
      if (auth.user_id) {
        myUserIdCache.set(config.id, auth.user_id as string);
      }
    } catch {
      // Skip workspaces with auth issues
    }
  }
  return myUserIdCache;
}

// Track the latest message timestamp we've processed per workspace+channel
function getLastProcessedTs(workspaceId: string, channelId: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT MAX(message_ts) as max_ts FROM auto_reply_log WHERE workspace_id = ? AND channel_id = ?")
    .get(workspaceId, channelId) as { max_ts: string | null } | undefined;
  return row?.max_ts ?? null;
}

export async function processAutoReplies(): Promise<void> {
  const now = Date.now();
  const rules = getActiveAutoReplies(now);
  if (rules.length === 0) return;

  const myUserIds = await getMyUserIds();
  const configs = loadWorkspaceConfigs();

  // Determine which workspaces we need to check based on active rules
  const workspacesToCheck = new Set<string>();
  for (const rule of rules) {
    if (rule.scope === "global" || (rule.scope === "dm" && !rule.workspaceId)) {
      configs.forEach((c) => workspacesToCheck.add(c.id));
    } else if (rule.workspaceId) {
      workspacesToCheck.add(rule.workspaceId);
    }
  }

  for (const wsId of workspacesToCheck) {
    try {
      const client = getClient(wsId);
      const myUserId = myUserIds.get(wsId);
      if (!myUserId) continue;

      // Get channels with recent activity using conversations.list
      const convResult = await client.users.conversations({
        types: "public_channel,private_channel,mpim,im",
        exclude_archived: true,
        limit: 50,
      });

      const channels = (convResult.channels ?? []) as Record<string, unknown>[];

      for (const ch of channels) {
        const channelId = ch.id as string;
        const isDm = !!(ch.is_im || ch.is_mpim);

        // Get recent messages in this channel
        const lastTs = getLastProcessedTs(wsId, channelId);
        const history = await client.conversations.history({
          channel: channelId,
          limit: 5,
          ...(lastTs ? { oldest: lastTs, inclusive: false } : {}),
        });

        const messages = (history.messages ?? []) as Record<string, unknown>[];

        for (const msg of messages) {
          const senderId = msg.user as string;
          const messageTs = msg.ts as string;
          const text = (msg.text as string) ?? "";
          if (!senderId || !messageTs) continue;

          const incoming: IncomingMessage = {
            workspaceId: wsId,
            channelId,
            userId: senderId,
            messageTs,
            text,
            isDm,
          };

          // Check each rule
          for (const rule of rules) {
            if (!ruleMatches(rule, incoming, myUserIds)) continue;
            if (hasReplied(rule.id, wsId, channelId, messageTs)) continue;

            try {
              await client.chat.postMessage({
                channel: channelId,
                text: rule.replyText,
                thread_ts: messageTs,
              });
              logReply(rule.id, wsId, channelId, messageTs);
              console.log(`[auto-reply] Replied to ${messageTs} in ${channelId} (rule ${rule.id})`);
            } catch (err) {
              console.error(`[auto-reply] Failed to reply to ${messageTs}:`, err);
              // Log it anyway to avoid retrying forever
              logReply(rule.id, wsId, channelId, messageTs);
            }
          }
        }
      }
    } catch (err) {
      console.error(`[auto-reply] Error processing workspace ${wsId}:`, err);
    }
  }
}

import { WebClient } from "@slack/web-api";
import { WorkspaceConfig, UnreadMessage, WorkspaceSummary, FeedResponse } from "./types";
import { loadWorkspaceConfigs } from "./config";
import { getClientForConfig } from "./client";
import { buildDeepLink } from "./deep-link";
import { isRateLimited, setRetryAfter } from "./rate-limiter";
import { getCachedUserRaw, upsertUser } from "../cache/users";
import { getMyUserId, setMyUserId } from "../cache/cursors";
import { slackTsToMs } from "../utils/time";
import { convertEmoji } from "../utils/emoji";

const MAX_MESSAGES_PER_CHANNEL = 5;
const MAX_CHANNELS_TO_CHECK = 100;

// Retry a Slack API call on rate-limit errors (up to 2 retries)
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const retryAfter = err?.data?.headers?.["retry-after"];
      if (retryAfter && attempt < retries) {
        const wait = Math.min(parseInt(retryAfter, 10), 5) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

async function resolveUser(
  client: WebClient,
  workspaceId: string,
  userId: string
): Promise<{ displayName: string; avatarUrl: string }> {
  const cached = getCachedUserRaw(workspaceId, userId);
  if (cached) {
    return {
      displayName: cached.display_name || cached.real_name || userId,
      avatarUrl: cached.avatar_url || "",
    };
  }

  try {
    const result = await client.users.info({ user: userId });
    const profile = result.user?.profile;
    const displayName =
      profile?.display_name || result.user?.real_name || userId;
    const avatarUrl = profile?.image_48 || "";

    upsertUser(
      workspaceId,
      userId,
      profile?.display_name || "",
      result.user?.real_name || "",
      avatarUrl
    );

    return { displayName, avatarUrl };
  } catch {
    return { displayName: userId, avatarUrl: "" };
  }
}

async function getAuthUserId(
  client: WebClient,
  workspaceId: string
): Promise<string> {
  const cached = getMyUserId(workspaceId);
  if (cached) return cached;

  const result = await client.auth.test();
  const userId = result.user_id as string;
  setMyUserId(workspaceId, userId);
  return userId;
}

// Resolve <@USERID> mentions in message text to display names
async function resolveMentions(
  client: WebClient,
  workspaceId: string,
  text: string
): Promise<string> {
  const mentionPattern = /<@([A-Z0-9]+)>/g;
  const matches = [...text.matchAll(mentionPattern)];
  if (matches.length === 0) return text;

  // Collect unique user IDs
  const userIds = [...new Set(matches.map((m) => m[1]))];

  // Resolve all in parallel
  const resolved = await Promise.all(
    userIds.map(async (uid) => {
      const { displayName } = await resolveUser(client, workspaceId, uid);
      return { uid, displayName };
    })
  );

  let result = text;
  for (const { uid, displayName } of resolved) {
    result = result.replaceAll(`<@${uid}>`, `@${displayName}`);
  }
  return result;
}

function classifyChannelType(
  channel: Record<string, unknown>
): "channel" | "dm" | "group_dm" | "private" {
  if (channel.is_im) return "dm";
  if (channel.is_mpim) return "group_dm";
  if (channel.is_private) return "private";
  return "channel";
}

async function fetchUnreadsForWorkspace(
  config: WorkspaceConfig
): Promise<{ messages: UnreadMessage[]; summary: WorkspaceSummary }> {
  const client = getClientForConfig(config);
  const messages: UnreadMessage[] = [];

  if (isRateLimited(config.id)) {
    return {
      messages: [],
      summary: {
        id: config.id,
        teamId: config.teamId,
        name: config.teamName,
        color: config.color,
        unreadCount: 0,
        channelsWithUnreads: 0,
        lastUpdated: Date.now(),
        error: "Rate limited — waiting for retry",
      },
    };
  }

  const myUserId = await getAuthUserId(client, config.id);

  // Step 1: Get conversations (capped to avoid rate limits on large workspaces)
  let allConversations: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  do {
    const result = await withRetry(() =>
      client.users.conversations({
        types: "public_channel,private_channel,mpim,im",
        exclude_archived: true,
        limit: 200,
        cursor,
      })
    );

    const channels = (result.channels ?? []) as Record<string, unknown>[];
    allConversations = allConversations.concat(channels);
    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor && allConversations.length < MAX_CHANNELS_TO_CHECK);

  // Cap total channels to prevent rate limit storms
  if (allConversations.length > MAX_CHANNELS_TO_CHECK) {
    allConversations = allConversations.slice(0, MAX_CHANNELS_TO_CHECK);
  }

  // Step 2: For each channel, fetch recent history and compare with last_read
  // Batch parallel calls — smaller batches reduce rate limit pressure
  const BATCH_SIZE = 5;
  let channelsWithUnreads = 0;

  for (let i = 0; i < allConversations.length; i += BATCH_SIZE) {
    const batch = allConversations.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (conv) => {
        const channelId = conv.id as string;
        const channelType = classifyChannelType(conv);
        const channelName =
          channelType === "dm"
            ? undefined
            : (conv.name as string) || "unknown";

        // Single call: get last_read from conversations.info
        const info = await withRetry(() =>
          client.conversations.info({ channel: channelId })
        );
        const ch = info.channel as Record<string, unknown> | undefined;
        const lastRead = ch?.last_read as string | undefined;

        if (!lastRead) return [];

        // Fetch messages newer than last_read
        const history = await withRetry(() =>
          client.conversations.history({
            channel: channelId,
            oldest: lastRead,
            inclusive: false,
            limit: MAX_MESSAGES_PER_CHANNEL,
          })
        );

        const msgs = (history.messages ?? []) as Record<string, unknown>[];
        if (msgs.length === 0) return [];

        // Resolve channel name for DMs
        let resolvedChannelName = channelName || "unknown";
        if (channelType === "dm" && conv.user) {
          const userInfo = await resolveUser(client, config.id, conv.user as string);
          resolvedChannelName = userInfo.displayName;
        }

        channelsWithUnreads++;

        // Process messages
        const channelMessages: UnreadMessage[] = [];
        for (const msg of msgs) {
          const userId = msg.user as string;
          if (!userId) continue;

          const { displayName, avatarUrl } = await resolveUser(client, config.id, userId);
          const messageTs = msg.ts as string;
          const rawText = (msg.text as string) || "";
          // Resolve @mentions and convert :emoji: shortcodes
          const text = convertEmoji(
            await resolveMentions(client, config.id, rawText)
          );

          channelMessages.push({
            id: `${config.teamId}-${channelId}-${messageTs}`,
            workspaceId: config.id,
            workspaceName: config.teamName,
            workspaceColor: config.color,
            channelId,
            channelName: resolvedChannelName,
            channelType,
            messageTs,
            text,
            userId,
            userName: displayName,
            userAvatar: avatarUrl,
            timestamp: slackTsToMs(messageTs),
            deepLink: buildDeepLink({
              teamId: config.teamId,
              teamDomain: config.teamDomain,
              channelId,
              messageTs,
              userId: channelType === "dm" ? (conv.user as string) : undefined,
              isDm: channelType === "dm",
            }),
            isMention: text.includes(`<@${myUserId}>`),
            isDirectMessage: channelType === "dm",
            threadTs: msg.thread_ts as string | undefined,
          });
        }

        return channelMessages;
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        messages.push(...result.value);
      } else if (result.status === "rejected") {
        const err = result.reason;
        // Handle rate limiting
        if (err?.data?.headers?.["retry-after"]) {
          setRetryAfter(config.id, parseInt(err.data.headers["retry-after"], 10));
        }
      }
    }
  }

  return {
    messages,
    summary: {
      id: config.id,
      teamId: config.teamId,
      name: config.teamName,
      color: config.color,
      unreadCount: messages.length,
      channelsWithUnreads,
      lastUpdated: Date.now(),
    },
  };
}

export async function fetchAllUnreads(
  filterWorkspace?: string
): Promise<FeedResponse> {
  const configs = loadWorkspaceConfigs();
  const targetConfigs = filterWorkspace
    ? configs.filter((c) => c.id === filterWorkspace)
    : configs;

  const results = await Promise.allSettled(
    targetConfigs.map((config) => fetchUnreadsForWorkspace(config))
  );

  const allMessages: UnreadMessage[] = [];
  const workspaces: WorkspaceSummary[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const config = targetConfigs[i];

    if (result.status === "fulfilled") {
      allMessages.push(...result.value.messages);
      workspaces.push(result.value.summary);
    } else {
      console.error(`Failed to fetch workspace ${config.id}:`, result.reason);
      workspaces.push({
        id: config.id,
        teamId: config.teamId,
        name: config.teamName,
        color: config.color,
        unreadCount: 0,
        channelsWithUnreads: 0,
        lastUpdated: Date.now(),
        error: String(result.reason),
      });
    }
  }

  allMessages.sort((a, b) => b.timestamp - a.timestamp);

  return {
    messages: allMessages,
    workspaces,
    totalUnread: allMessages.length,
    fetchedAt: Date.now(),
  };
}

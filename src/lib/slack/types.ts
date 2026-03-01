export interface WorkspaceConfig {
  id: string;
  teamId: string;
  teamName: string;
  teamDomain: string;
  token: string;
  cookie: string; // xoxd- cookie required for xoxc- session tokens
  color: string;
}

export interface UnreadMessage {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceColor: string;
  channelId: string;
  channelName: string;
  channelType: "channel" | "dm" | "group_dm" | "private";
  messageTs: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: number;
  deepLink: string;
  isMention: boolean;
  isDirectMessage: boolean;
  threadTs?: string;
}

export interface WorkspaceSummary {
  id: string;
  teamId: string;
  name: string;
  color: string;
  unreadCount: number;
  channelsWithUnreads: number;
  lastUpdated: number;
  error?: string;
}

export interface FeedResponse {
  messages: UnreadMessage[];
  workspaces: WorkspaceSummary[];
  totalUnread: number;
  fetchedAt: number;
  myNames: string[]; // authenticated user's display names across workspaces
}

export interface ChannelInfo {
  id: string;
  name: string;
  type: "channel" | "dm" | "group_dm" | "private";
  lastRead: string;
  latestTs: string;
  userId?: string; // For DMs, the other user's ID
}

export interface CachedUser {
  workspaceId: string;
  userId: string;
  displayName: string;
  realName: string;
  avatarUrl: string;
  updatedAt: number;
}

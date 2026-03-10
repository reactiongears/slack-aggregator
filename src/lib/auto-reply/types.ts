export type AutoReplyScope = "global" | "workspace" | "channel" | "dm" | "user";

export interface AutoReply {
  id: string;
  scope: AutoReplyScope;
  workspaceId: string | null;
  channelId: string | null;
  channelName: string | null;
  userId: string | null;
  userName: string | null;
  replyText: string;
  startTime: number; // Unix timestamp ms
  endTime: number; // Unix timestamp ms
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAutoReplyRequest {
  scope: AutoReplyScope;
  workspaceId?: string;
  channelId?: string;
  channelName?: string;
  userId?: string;
  userName?: string;
  replyText: string;
  startTime: number;
  endTime: number;
}

export interface UpdateAutoReplyRequest {
  replyText?: string;
  startTime?: number;
  endTime?: number;
  enabled?: boolean;
}

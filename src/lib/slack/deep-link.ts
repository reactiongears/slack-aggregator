export interface DeepLinkParams {
  teamId: string;
  teamDomain: string;
  channelId: string;
  messageTs?: string;
  userId?: string;
  isDm?: boolean;
}

export function buildDeepLink(params: DeepLinkParams): string {
  const { teamId, teamDomain, channelId, messageTs, userId, isDm } = params;

  // For specific messages, use slack:// protocol to open in Slack app
  if (messageTs) {
    return `slack://channel?team=${teamId}&id=${channelId}&message=${messageTs}`;
  }

  // For DMs, link to the user
  if (isDm && userId) {
    return `slack://user?team=${teamId}&id=${userId}`;
  }

  // For channels, use the official slack:// protocol
  return `slack://channel?team=${teamId}&id=${channelId}`;
}

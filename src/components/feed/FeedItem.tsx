import { UnreadMessage } from "@/lib/slack/types";
import { Avatar } from "../ui/Avatar";
import { RelativeTime } from "../ui/RelativeTime";

interface FeedItemProps {
  message: UnreadMessage;
  onContextMenu?: (e: React.MouseEvent, message: UnreadMessage) => void;
}

function formatSlackText(text: string): string {
  // User mentions and emoji are already resolved server-side.
  // Handle remaining mrkdwn → plain text.
  return text
    .replace(/<@[A-Z0-9]+>/g, (match) => `@${match.slice(2, -1)}`) // fallback for unresolved mentions
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1") // channel links
    .replace(/<#[A-Z0-9]+>/g, (match) => `#${match.slice(2, -1)}`) // channel refs
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2") // url with display
    .replace(/<(https?:\/\/[^>]+)>/g, "$1") // plain urls
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function FeedItem({ message, onContextMenu }: FeedItemProps) {
  const channelLabel =
    message.channelType === "dm"
      ? "DM"
      : message.channelType === "group_dm"
        ? "Group DM"
        : `#${message.channelName}`;

  return (
    <a
      href={message.deepLink}
      className="flex gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 group"
      target="_blank"
      rel="noopener noreferrer"
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, message);
        }
      }}
    >
      {/* Workspace color indicator */}
      <div
        className="w-1 shrink-0 rounded-full self-stretch"
        style={{ backgroundColor: message.workspaceColor }}
      />

      {/* Avatar — square, sized by row height */}
      <div className="shrink-0 self-stretch aspect-square">
        {message.userAvatar ? (
          <img
            src={message.userAvatar}
            alt={message.userName}
            className="w-full h-full rounded-lg object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-lg bg-gray-600 flex items-center justify-center text-white font-medium text-sm">
            {message.userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm text-gray-200 truncate">
            {message.userName}
          </span>
          <span className="text-xs text-gray-500 truncate">
            {message.workspaceName}
          </span>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-500 truncate">{channelLabel}</span>
          <div className="ml-auto shrink-0 flex items-center gap-2">
            {message.isMention && (
              <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                @you
              </span>
            )}
            {message.isDirectMessage && (
              <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                DM
              </span>
            )}
            <RelativeTime timestamp={message.timestamp} />
          </div>
        </div>

        {/* Message preview */}
        <p className="text-sm text-gray-400 truncate">
          {formatSlackText(message.text)}
        </p>
      </div>

      {/* External link indicator */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-500"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    </a>
  );
}

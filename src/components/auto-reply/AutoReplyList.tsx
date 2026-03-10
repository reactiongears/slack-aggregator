"use client";

import { AutoReply } from "@/lib/auto-reply/types";

interface AutoReplyListProps {
  rules: AutoReply[];
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatDateRange(start: number, end: number): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  const startStr = new Date(start).toLocaleString([], opts);
  const endStr = new Date(end).toLocaleString([], opts);
  return `${startStr} — ${endStr}`;
}

function scopeLabel(rule: AutoReply): string {
  switch (rule.scope) {
    case "global":
      return "All workspaces";
    case "workspace":
      return rule.workspaceId ?? "Workspace";
    case "channel":
      return rule.channelName ? `#${rule.channelName}` : rule.channelId ?? "Channel";
    case "dm":
      return rule.workspaceId ? `DMs in ${rule.workspaceId}` : "All DMs";
    case "user":
      return rule.userName || rule.userId || "User";
  }
}

function statusLabel(rule: AutoReply): { text: string; color: string } {
  const now = Date.now();
  if (!rule.enabled) return { text: "Paused", color: "text-gray-600" };
  if (now < rule.startTime) return { text: "Scheduled", color: "text-yellow-500" };
  if (now > rule.endTime) return { text: "Expired", color: "text-gray-600" };
  return { text: "Active", color: "text-green-500" };
}

export function AutoReplyList({ rules, onToggle, onDelete }: AutoReplyListProps) {
  if (rules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-sm">No auto-reply rules</p>
        <p className="text-xs text-gray-600 mt-1">Click &quot;New Rule&quot; to create one</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rules.map((rule) => {
        const status = statusLabel(rule);
        return (
          <div
            key={rule.id}
            className={`bg-gray-900 border border-gray-800 rounded-lg p-3 ${
              !rule.enabled || status.text === "Expired" ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 capitalize">
                    {rule.scope}
                  </span>
                  <span className="text-xs text-gray-400">{scopeLabel(rule)}</span>
                  <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-wrap break-words mb-1">
                  {rule.replyText}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateRange(rule.startTime, rule.endTime)}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Toggle */}
                <button
                  onClick={() => onToggle(rule.id, !rule.enabled)}
                  className={`relative w-8 h-4.5 rounded-full transition-colors ${
                    rule.enabled ? "bg-indigo-600" : "bg-gray-700"
                  }`}
                  title={rule.enabled ? "Pause" : "Enable"}
                >
                  <span
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      rule.enabled ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDelete(rule.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { ScheduledMessage } from "@/lib/scheduler/types";

interface ScheduleListProps {
  messages: ScheduledMessage[];
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatNextRun(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (date.toDateString() === now.toDateString()) return `Today at ${timeStr}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow at ${timeStr}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
}

function formatSchedule(msg: ScheduledMessage): string {
  const timeStr = new Date(`2000-01-01T${msg.time}`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (msg.scheduleType === "once") return `One time at ${timeStr}`;
  if (msg.scheduleType === "daily") return `Daily at ${timeStr}`;
  if (msg.scheduleType === "days_of_week" && msg.daysOfWeek) {
    const days = msg.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ");
    return `${days} at ${timeStr}`;
  }
  return timeStr;
}

export function ScheduleList({ messages, onToggle, onDelete }: ScheduleListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p className="text-sm">No scheduled messages</p>
        <p className="text-xs text-gray-600 mt-1">Click &quot;New Schedule&quot; to create one</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`bg-gray-900 border border-gray-800 rounded-lg p-3 ${
            !msg.enabled ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">
                  #{msg.channelName}
                </span>
                <span className="text-xs text-gray-600">
                  {formatSchedule(msg)}
                </span>
              </div>
              <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                {msg.text}
              </p>
              <div className="flex items-center gap-3 mt-2">
                {msg.enabled && (
                  <span className="text-xs text-gray-500">
                    Next: {formatNextRun(msg.nextRun)}
                  </span>
                )}
                {msg.lastSent && (
                  <span className="text-xs text-gray-600">
                    Last sent: {new Date(msg.lastSent).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                {msg.lastError && (
                  <span className="text-xs text-red-400" title={msg.lastError}>
                    Error
                  </span>
                )}
                {!msg.enabled && msg.scheduleType === "once" && msg.lastSent && (
                  <span className="text-xs text-green-500">Sent</span>
                )}
                {!msg.enabled && !msg.lastSent && (
                  <span className="text-xs text-gray-600">Paused</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Toggle */}
              <button
                onClick={() => onToggle(msg.id, !msg.enabled)}
                className={`relative w-8 h-4.5 rounded-full transition-colors ${
                  msg.enabled ? "bg-indigo-600" : "bg-gray-700"
                }`}
                title={msg.enabled ? "Pause" : "Enable"}
              >
                <span
                  className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    msg.enabled ? "left-4" : "left-0.5"
                  }`}
                />
              </button>

              {/* Delete */}
              <button
                onClick={() => onDelete(msg.id)}
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
      ))}
    </div>
  );
}

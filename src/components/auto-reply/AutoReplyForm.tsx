"use client";

import { useState } from "react";
import { useChannels } from "@/hooks/useChannels";
import { AutoReplyScope, CreateAutoReplyRequest } from "@/lib/auto-reply/types";

interface Workspace {
  id: string;
  name: string;
  color: string;
}

interface AutoReplyFormProps {
  workspaces: Workspace[];
  onSubmit: (req: CreateAutoReplyRequest) => Promise<void>;
  onCancel: () => void;
}

const SCOPE_LABELS: Record<AutoReplyScope, string> = {
  global: "Global (all workspaces)",
  workspace: "Workspace",
  channel: "Channel",
  user: "Person",
};

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AutoReplyForm({ workspaces, onSubmit, onCancel }: AutoReplyFormProps) {
  const [scope, setScope] = useState<AutoReplyScope>("global");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [channelId, setChannelId] = useState("");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [replyText, setReplyText] = useState("");

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [startTime, setStartTime] = useState(toLocalDatetimeString(now));
  const [endTime, setEndTime] = useState(toLocalDatetimeString(tomorrow));
  const [submitting, setSubmitting] = useState(false);

  const needsWorkspace = scope !== "global";
  const { channels, isLoading: channelsLoading } = useChannels(
    needsWorkspace ? workspaceId : null
  );

  const selectedChannel = channels.find((ch) => ch.id === channelId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        scope,
        workspaceId: needsWorkspace ? workspaceId : undefined,
        channelId: scope === "channel" ? channelId : undefined,
        channelName: scope === "channel" ? (selectedChannel?.name ?? channelId) : undefined,
        userId: scope === "user" ? userId : undefined,
        userName: scope === "user" ? userName : undefined,
        replyText: replyText.trim(),
        startTime: new Date(startTime).getTime(),
        endTime: new Date(endTime).getTime(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200">New Auto-Reply Rule</h3>

      {/* Scope */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Scope</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SCOPE_LABELS) as AutoReplyScope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setScope(s); setChannelId(""); setUserId(""); setUserName(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                scope === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace (for workspace, channel, user scopes) */}
      {needsWorkspace && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Workspace</label>
          <select
            value={workspaceId}
            onChange={(e) => { setWorkspaceId(e.target.value); setChannelId(""); }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Channel (for channel scope) */}
      {scope === "channel" && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Channel</label>
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            disabled={channelsLoading}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600 disabled:opacity-50"
          >
            <option value="">{channelsLoading ? "Loading..." : "Select a channel"}</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.isIm ? `DM: ${ch.name}` : ch.isPrivate ? `# ${ch.name} (private)` : `# ${ch.name}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* User (for user scope) */}
      {scope === "user" && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Slack User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. U01ABCD2345"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Display Name (for your reference)</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600"
            />
          </div>
        </div>
      )}

      {/* Reply Text */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Auto-Reply Message</label>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="I'm currently away and will respond when I'm back..."
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600 resize-none"
        />
      </div>

      {/* Start / End Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Start</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">End</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gray-600"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || !replyText.trim() || (scope === "channel" && !channelId) || (scope === "user" && !userId)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create Rule"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

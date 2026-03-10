"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useChannels } from "@/hooks/useChannels";
import { AutoReplyScope, CreateAutoReplyRequest } from "@/lib/auto-reply/types";

interface Workspace {
  id: string;
  name: string;
  color: string;
}

interface SlackUser {
  id: string;
  displayName: string;
  realName: string;
  avatar: string;
}

interface AutoReplyFormProps {
  workspaces: Workspace[];
  onSubmit: (req: CreateAutoReplyRequest) => Promise<void>;
  onCancel: () => void;
}

const SCOPE_OPTIONS: { value: AutoReplyScope; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "workspace", label: "Workspace" },
  { value: "channel", label: "Channel" },
  { value: "dm", label: "All DMs" },
  { value: "user", label: "Person" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function UserTypeahead({
  workspaceId,
  selectedId,
  selectedName,
  onSelect,
}: {
  workspaceId: string;
  selectedId: string;
  selectedName: string;
  onSelect: (id: string, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useSWR<{ users: SlackUser[] }>(
    workspaceId ? `/api/users?workspaceId=${workspaceId}` : null,
    fetcher
  );

  const users = data?.users ?? [];
  const filtered = query
    ? users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(query.toLowerCase()) ||
          u.realName.toLowerCase().includes(query.toLowerCase())
      )
    : users;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selectedId) {
    return (
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <span className="text-sm text-gray-200">{selectedName || selectedId}</span>
        <button
          type="button"
          onClick={() => onSelect("", "")}
          className="text-gray-500 hover:text-gray-300 text-xs ml-auto"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search for a person..."
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
          {filtered.slice(0, 20).map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onSelect(u.id, u.displayName);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-left transition-colors"
            >
              {u.avatar && (
                <img src={u.avatar} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-sm text-gray-200 truncate">{u.displayName}</span>
              {u.realName && u.realName !== u.displayName && (
                <span className="text-xs text-gray-500 truncate">{u.realName}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-500">
          No users found
        </div>
      )}
    </div>
  );
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
    scope === "channel" ? workspaceId : null
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
          {SCOPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setScope(value); setChannelId(""); setUserId(""); setUserName(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                scope === value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1.5">
          {scope === "global" && "Replies to @mentions in all workspaces"}
          {scope === "workspace" && "Replies to @mentions in the selected workspace"}
          {scope === "channel" && "Replies to @mentions in a specific channel"}
          {scope === "dm" && "Replies to all direct messages"}
          {scope === "user" && "Replies to all messages from a specific person"}
        </p>
      </div>

      {/* Workspace (for workspace, channel, dm, user scopes) */}
      {needsWorkspace && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Workspace{scope === "dm" ? " (optional — leave for all)" : ""}
          </label>
          <select
            value={workspaceId}
            onChange={(e) => { setWorkspaceId(e.target.value); setChannelId(""); setUserId(""); setUserName(""); }}
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

      {/* User typeahead (for user scope) */}
      {scope === "user" && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Person</label>
          <UserTypeahead
            workspaceId={workspaceId}
            selectedId={userId}
            selectedName={userName}
            onSelect={(id, name) => { setUserId(id); setUserName(name); }}
          />
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

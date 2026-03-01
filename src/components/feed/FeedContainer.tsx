"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useFeed } from "@/hooks/useFeed";
import { useFavicon } from "@/hooks/useFavicon";
import { FeedItem } from "./FeedItem";
import { FeedSkeleton } from "./FeedSkeleton";
import { EmptyState } from "./EmptyState";
import { ContextMenu } from "./ContextMenu";
import { WorkspaceList } from "../sidebar/WorkspaceList";
import { Header } from "../header/Header";
import { AddWorkspaceModal } from "../sidebar/AddWorkspaceModal";
import { IgnoreListPanel } from "../sidebar/IgnoreListPanel";
import { getDateLabel } from "@/lib/utils/time";
import { UnreadMessage } from "@/lib/slack/types";

interface IgnoreEntry {
  type: "user" | "channel";
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
}

export function FeedContainer() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<
    string | undefined
  >();
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [showIgnoreList, setShowIgnoreList] = useState(false);

  // Ignore list
  const [ignores, setIgnores] = useState<IgnoreEntry[]>([]);

  const fetchIgnores = useCallback(async () => {
    try {
      const res = await fetch("/api/ignores");
      const data = await res.json();
      setIgnores(data.entries || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchIgnores();
  }, [fetchIgnores]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: UnreadMessage;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, message: UnreadMessage) => {
      setContextMenu({ x: e.clientX, y: e.clientY, message });
    },
    []
  );

  const handleIgnoreUser = useCallback(async () => {
    if (!contextMenu) return;
    const { message } = contextMenu;
    await fetch("/api/ignores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "user",
        id: message.userId,
        name: message.userName,
        workspaceId: message.workspaceId,
        workspaceName: message.workspaceName,
      }),
    });
    fetchIgnores();
  }, [contextMenu, fetchIgnores]);

  const handleIgnoreChannel = useCallback(async () => {
    if (!contextMenu) return;
    const { message } = contextMenu;
    await fetch("/api/ignores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "channel",
        id: message.channelId,
        name: message.channelName,
        workspaceId: message.workspaceId,
        workspaceName: message.workspaceName,
      }),
    });
    fetchIgnores();
  }, [contextMenu, fetchIgnores]);

  const { feed, isLoading, isError, refresh, removeMessage } = useFeed(selectedWorkspace);

  const handleMarkRead = useCallback(async () => {
    if (!contextMenu) return;
    const { message } = contextMenu;
    // Instantly remove from UI
    removeMessage(message.id);
    // Then tell Slack in the background
    fetch("/api/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: message.workspaceId,
        channelId: message.channelId,
        ts: message.messageTs,
      }),
    });
  }, [contextMenu, removeMessage]);

  // Update page title and favicon with unread count
  const totalUnread = feed?.totalUnread ?? 0;
  useFavicon(totalUnread);
  if (typeof document !== "undefined") {
    document.title =
      totalUnread > 0
        ? `(${totalUnread}) Slack Aggregator`
        : "Slack Aggregator";
  }

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (!feed?.messages) return [];

    let messages = feed.messages;

    // Filter out ignored users and channels
    if (ignores.length > 0) {
      messages = messages.filter(
        (m) =>
          !ignores.some(
            (ig) =>
              ig.workspaceId === m.workspaceId &&
              ((ig.type === "user" && ig.id === m.userId) ||
                (ig.type === "channel" && ig.id === m.channelId))
          )
      );
    }

    // Filter by type
    if (filterType === "mentions") {
      messages = messages.filter((m) => m.isMention);
    } else if (filterType === "dms") {
      messages = messages.filter((m) => m.isDirectMessage);
    } else if (filterType === "channels") {
      messages = messages.filter(
        (m) => !m.isDirectMessage && m.channelType !== "group_dm"
      );
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      messages = messages.filter(
        (m) =>
          m.text.toLowerCase().includes(q) ||
          m.userName.toLowerCase().includes(q) ||
          m.channelName.toLowerCase().includes(q)
      );
    }

    return messages;
  }, [feed?.messages, filterType, searchQuery, ignores]);

  // Group by date for separators
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: typeof filteredMessages }[] = [];
    let currentLabel = "";

    for (const msg of filteredMessages) {
      const label = getDateLabel(msg.timestamp);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }

    return groups;
  }, [filteredMessages]);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Workspaces
          </h2>
        </div>
        <WorkspaceList
          workspaces={feed?.workspaces ?? []}
          selectedWorkspace={selectedWorkspace}
          onSelect={setSelectedWorkspace}
          onAddWorkspace={() => setShowAddWorkspace(true)}
        />
        <div className="p-3 border-t border-gray-800 space-y-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Filter
          </p>
          {[
            { key: "all", label: "All Messages" },
            { key: "mentions", label: "Mentions" },
            { key: "dms", label: "Direct Messages" },
            { key: "channels", label: "Channels" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`block w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                filterType === f.key
                  ? "bg-gray-800 text-gray-200"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Ignored list button */}
          <button
            onClick={() => setShowIgnoreList(true)}
            className={`flex items-center justify-between w-full text-left text-xs px-2 py-1.5 rounded transition-colors text-gray-500 hover:text-gray-300 hover:bg-gray-800/50`}
          >
            <span>Ignored</span>
            {ignores.length > 0 && (
              <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">
                {ignores.length}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main feed */}
      <main className="flex-1 flex flex-col min-w-0">
        <Header
          totalUnread={totalUnread}
          onRefresh={refresh}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="flex-1 overflow-y-auto">
          {isLoading && !feed ? (
            <FeedSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-red-400">
              <p className="text-lg font-medium">Failed to load notifications</p>
              <p className="text-sm text-gray-500 mt-1">
                Check your Slack tokens in .env.local
              </p>
              <button
                onClick={refresh}
                className="mt-4 px-4 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <EmptyState />
          ) : (
            groupedMessages.map((group) => (
              <div key={group.label}>
                {/* Date separator */}
                <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm px-4 py-2 border-b border-gray-800/50">
                  <span className="text-xs font-semibold text-gray-500">
                    {group.label}
                  </span>
                </div>
                {group.messages.map((message) => (
                  <FeedItem
                    key={message.id}
                    message={message}
                    onContextMenu={handleContextMenu}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer status */}
        {feed && (
          <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-600 flex justify-between">
            <span>
              {filteredMessages.length} message
              {filteredMessages.length !== 1 ? "s" : ""}
              {filterType !== "all" ? ` (filtered)` : ""}
            </span>
            <span>
              Last updated:{" "}
              {new Date(feed.fetchedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </main>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          userName={contextMenu.message.userName}
          channelName={contextMenu.message.channelName}
          onMarkRead={handleMarkRead}
          onIgnoreUser={handleIgnoreUser}
          onIgnoreChannel={handleIgnoreChannel}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Modals */}
      {showAddWorkspace && (
        <AddWorkspaceModal
          onClose={() => setShowAddWorkspace(false)}
          onAdded={() => refresh()}
        />
      )}
      {showIgnoreList && (
        <IgnoreListPanel
          onClose={() => setShowIgnoreList(false)}
          onChanged={fetchIgnores}
        />
      )}
    </div>
  );
}

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
  const [tryingCookies, setTryingCookies] = useState(false);

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
          onReauth={() => setShowAddWorkspace(true)}
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
          ) : feed && feed.workspaces.length > 0 && feed.workspaces.every((w) => w.error?.includes("invalid_auth")) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-200 mb-2">
                Session Expired
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mb-6">
                Your Slack session tokens have expired. Click below to reconnect — we'll try existing cookies first.
              </p>
              <button
                disabled={tryingCookies}
                onClick={async () => {
                  setTryingCookies(true);
                  // Try each failing workspace against other cookies
                  const failing = feed!.workspaces.filter((w) => w.error?.includes("invalid_auth"));
                  let anyFixed = false;
                  for (const ws of failing) {
                    try {
                      const res = await fetch("/api/auth/try-refresh", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ workspaceId: ws.id }),
                      });
                      const data = await res.json();
                      if (data.ok) anyFixed = true;
                    } catch {}
                  }
                  setTryingCookies(false);
                  if (!anyFixed) {
                    setShowAddWorkspace(true);
                  }
                  // If any were fixed, feed will auto-refresh via SWR
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {tryingCookies ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Trying cookies...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Reconnect
                  </>
                )}
              </button>
            </div>
          ) : feed && feed.workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-200 mb-2">
                Welcome to Slack Aggregator
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mb-6">
                See all your unread Slack messages from every workspace in one place.
                Add your first workspace to get started.
              </p>
              <button
                onClick={() => setShowAddWorkspace(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Workspace
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
                    myNames={feed?.myNames ?? []}
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

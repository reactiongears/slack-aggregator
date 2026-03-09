"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { UnreadMessage } from "@/lib/slack/types";
import { RelativeTime } from "../ui/RelativeTime";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface FeedItemProps {
  message: UnreadMessage;
  myNames?: string[];
  onContextMenu?: (e: React.MouseEvent, message: UnreadMessage) => void;
}

function formatSlackText(text: string): string {
  // User mentions and emoji are already resolved server-side.
  // Handle remaining mrkdwn → plain text.
  return text
    .replace(/<!here>/g, "@here")
    .replace(/<!channel>/g, "@channel")
    .replace(/<!everyone>/g, "@everyone")
    .replace(/<@[A-Z0-9]+>/g, (match) => `@${match.slice(2, -1)}`)
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<#[A-Z0-9]+>/g, (match) => `#${match.slice(2, -1)}`)
    .replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:\/\/[^>]+)>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Splits formatted text on mention markers and renders styled spans:
//  «@!Name» → gold (self), «@Name» → blue (others),
//  @here/@channel/@everyone → gold, plain @Name from bots → blue
const MENTION_RE = /(«@!.+?»|«@.+?»|@here|@channel|@everyone|(?<![a-zA-Z0-9.])@[a-zA-Z]\w+)/g;

function renderSlackText(text: string, myNames: string[] = []): ReactNode {
  const formatted = formatSlackText(text);
  const parts = formatted.split(MENTION_RE);
  if (parts.length === 1) return formatted;

  // Lowercase set for case-insensitive matching of plain-text @mentions
  const myNamesLower = myNames.map((n) => n.toLowerCase());
  const isSelfPlainMention = (mention: string) => {
    // mention is like "@Mike" — compare name part against myNames
    const name = mention.slice(1).toLowerCase();
    return myNamesLower.some(
      (n) => n === name || n.startsWith(name) || name.startsWith(n.split(" ")[0])
    );
  };

  const gold = "font-semibold text-yellow-400 bg-yellow-400/10 px-0.5 rounded";
  const blue = "font-semibold text-blue-400 bg-blue-400/10 px-0.5 rounded";

  return parts.map((part, i) => {
    if (part.startsWith("«@!") && part.endsWith("»")) {
      return <span key={i} className={gold}>@{part.slice(3, -1)}</span>;
    }
    if (part.startsWith("«@") && part.endsWith("»")) {
      return <span key={i} className={blue}>@{part.slice(2, -1)}</span>;
    }
    if (part === "@here" || part === "@channel" || part === "@everyone") {
      return <span key={i} className={gold}>{part}</span>;
    }
    if (/^@[a-zA-Z]\w+$/.test(part)) {
      const cls = isSelfPlainMention(part) ? gold : blue;
      return <span key={i} className={cls}>{part}</span>;
    }
    return part;
  });
}

export function FeedItem({ message, myNames, onContextMenu }: FeedItemProps) {
  const [mode, setMode] = useState<"idle" | "menu" | "reply" | "react">("idle");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [reacted, setReacted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const channelLabel =
    message.channelType === "dm"
      ? "DM"
      : message.channelType === "group_dm"
        ? "Group DM"
        : `#${message.channelName}`;

  // Close menu on outside click
  useEffect(() => {
    if (mode !== "menu") return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMode("idle");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mode]);

  // Auto-focus textarea when reply opens
  useEffect(() => {
    if (mode === "reply") {
      inputRef.current?.focus();
    }
  }, [mode]);

  // Escape key dismisses react picker
  useEffect(() => {
    if (mode !== "react") return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMode("idle");
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [mode]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    setMode("menu");
  };

  const handleGoTo = () => {
    setMode("idle");
    window.open(message.deepLink, "_blank");
  };

  const handleQuickReply = () => {
    setMode("reply");
    setSent(false);
    setReplyText("");
  };

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: message.workspaceId,
          channelId: message.channelId,
          text: replyText.trim(),
          threadTs: message.threadTs || message.messageTs,
        }),
      });
      if (res.ok) {
        setSent(true);
        setReplyText("");
        setTimeout(() => {
          setMode("idle");
          setSent(false);
        }, 1500);
      }
    } catch {
      // keep input open on error
    } finally {
      setSending(false);
    }
  };

  const handleReact = () => {
    setMode("react");
    setReacted(false);
  };

  const handleEmojiSelect = async (shortcode: string) => {
    if (reacting) return;
    setReacting(true);
    try {
      const res = await fetch("/api/add-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: message.workspaceId,
          channelId: message.channelId,
          timestamp: message.messageTs,
          emoji: shortcode,
        }),
      });
      if (res.ok) {
        setReacted(true);
        setTimeout(() => {
          setMode("idle");
          setReacted(false);
        }, 1500);
      }
    } catch {
      // keep picker open on error
    } finally {
      setReacting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setMode("idle");
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative border-b border-gray-800/50"
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, message);
        }
      }}
    >
      {/* Main row */}
      <div
        onClick={handleClick}
        className="flex gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors group cursor-pointer"
      >
        {/* Workspace color indicator */}
        <div
          className="w-1 shrink-0 rounded-full self-stretch"
          style={{ backgroundColor: message.workspaceColor }}
        />

        {/* Avatar */}
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
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-gray-200 truncate">
              {message.userName}
            </span>
            <span className="text-xs text-gray-500 truncate">
              {message.workspaceName}
            </span>
            <span className="text-gray-700">&middot;</span>
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
          <p className="text-sm text-gray-400 truncate">
            {renderSlackText(message.text, myNames)}
          </p>
        </div>

        {/* Arrow icon */}
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
      </div>

      {/* Click action menu */}
      {mode === "menu" && (
        <div
          ref={menuRef}
          style={{ left: menuPos.x, top: menuPos.y }}
          className="absolute z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[170px]"
        >
          <button
            onClick={handleQuickReply}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors flex items-center gap-2.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Quick Reply
          </button>
          <button
            onClick={handleReact}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors flex items-center gap-2.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            React
          </button>
          <button
            onClick={handleGoTo}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors flex items-center gap-2.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Go to Slack
          </button>
        </div>
      )}

      {/* Inline reply */}
      {mode === "reply" && (
        <div className="px-4 pb-3 pl-[72px]">
          {sent ? (
            <div className="flex items-center gap-2 py-2 text-sm text-green-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Message sent
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Reply to ${message.userName}...`}
                rows={1}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!replyText.trim() || sending}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shrink-0"
              >
                {sending ? "..." : "Send"}
              </button>
              <button
                onClick={() => setMode("idle")}
                className="px-2 py-2 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline emoji picker */}
      {mode === "react" && (
        <div className="px-4 pb-3 pl-[72px]">
          {reacted ? (
            <div className="flex items-center gap-2 py-2 text-sm text-green-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Reaction added
            </div>
          ) : (
            <div>
              <div className="text-xs text-gray-500 mb-2">
                {reacting ? "Adding reaction..." : "Pick a reaction"}
              </div>
              <Picker
                data={data}
                onEmojiSelect={(emoji: { id: string }) => handleEmojiSelect(emoji.id)}
                theme="dark"
                perLine={8}
                emojiSize={20}
                emojiButtonSize={28}
                previewPosition="none"
                navPosition="bottom"
                searchPosition="sticky"
                maxFrequentRows={2}
                skinTonePosition="search"
              />
              <button
                onClick={() => setMode("idle")}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

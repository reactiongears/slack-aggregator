"use client";

import { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  userName: string;
  channelName: string;
  onMarkRead: () => void;
  onIgnoreUser: () => void;
  onIgnoreChannel: () => void;
  onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  userName,
  channelName,
  onMarkRead,
  onIgnoreUser,
  onIgnoreChannel,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Keep menu on screen
  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 100,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px] animate-in fade-in"
    >
      <button
        onClick={() => {
          onMarkRead();
          onClose();
        }}
        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors flex items-center gap-2.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Mark as Read
      </button>
      <div className="border-t border-gray-700 my-1" />
      <button
        onClick={() => {
          onIgnoreUser();
          onClose();
        }}
        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors flex items-center gap-2.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" y1="8" x2="23" y2="14" />
          <line x1="23" y1="8" x2="17" y2="14" />
        </svg>
        Ignore {userName}
      </button>
      <button
        onClick={() => {
          onIgnoreChannel();
          onClose();
        }}
        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors flex items-center gap-2.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        Ignore #{channelName}
      </button>
    </div>
  );
}

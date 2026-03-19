"use client";

import { useState } from "react";
import { WorkspaceSummary } from "@/lib/slack/types";
import { WorkspaceIcon } from "../ui/WorkspaceIcon";
import { Badge } from "../ui/Badge";

interface WorkspaceBadgeProps {
  workspace: WorkspaceSummary;
  isSelected: boolean;
  onClick: () => void;
  onReauth?: () => void;
}

export function WorkspaceBadge({
  workspace,
  isSelected,
  onClick,
  onReauth,
}: WorkspaceBadgeProps) {
  const hasAuthError = workspace.error?.includes("invalid_auth");
  const [refreshing, setRefreshing] = useState(false);

  const handleRelogin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);

    try {
      // Try existing cookies from other workspaces first
      const res = await fetch("/api/auth/try-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      const data = await res.json();
      if (data.ok) {
        // Cookie from another workspace worked — feed will refresh automatically
        setRefreshing(false);
        return;
      }
    } catch {
      // try-refresh failed — fall through to browser login
    }

    setRefreshing(false);
    onReauth?.();
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
        isSelected
          ? "bg-gray-800 text-gray-100"
          : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
      }`}
    >
      <WorkspaceIcon name={workspace.name} color={workspace.color} icon={workspace.icon} size={6} />
      <span className="text-sm font-medium truncate flex-1 text-left">
        {workspace.name}
      </span>
      {hasAuthError ? (
        refreshing ? (
          <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
            Trying...
          </span>
        ) : (
          <span
            onClick={handleRelogin}
            title="Session expired — click to re-login"
            className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded hover:bg-red-400/20 transition-colors cursor-pointer"
          >
            Re-login
          </span>
        )
      ) : workspace.error ? (
        <span className="text-[10px] text-red-400" title={workspace.error}>
          err
        </span>
      ) : (
        <Badge count={workspace.unreadCount} color={workspace.color} />
      )}
    </button>
  );
}

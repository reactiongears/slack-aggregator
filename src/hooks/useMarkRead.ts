"use client";

import { useCallback } from "react";
import { useFeed } from "./useFeed";

export function useMarkRead() {
  const { refresh } = useFeed();

  const markRead = useCallback(
    async (workspaceId: string, channelId: string, ts: string) => {
      try {
        const res = await fetch("/api/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, channelId, ts }),
        });

        if (!res.ok) {
          throw new Error("Failed to mark as read");
        }

        // Refresh the feed after marking as read
        await refresh();
        return true;
      } catch (error) {
        console.error("Mark read failed:", error);
        return false;
      }
    },
    [refresh]
  );

  return { markRead };
}

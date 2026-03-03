"use client";

import useSWR from "swr";
import { FeedResponse } from "@/lib/slack/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useFeed(workspace?: string) {
  const params = workspace ? `?workspace=${workspace}` : "";
  const { data, error, isLoading, mutate } = useSWR<FeedResponse>(
    `/api/feed${params}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      errorRetryInterval: 3000,
      errorRetryCount: Infinity,
    }
  );

  // Optimistically remove a message by ID from the local cache
  const removeMessage = (messageId: string) => {
    if (!data) return;
    mutate(
      {
        ...data,
        messages: data.messages.filter((m) => m.id !== messageId),
        totalUnread: Math.max(0, data.totalUnread - 1),
      },
      false // don't revalidate yet
    );
  };

  return {
    feed: data,
    isLoading,
    isError: !!error,
    error,
    refresh: () => mutate(),
    removeMessage,
  };
}

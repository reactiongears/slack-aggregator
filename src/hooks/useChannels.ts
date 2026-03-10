"use client";

import useSWR from "swr";

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
  isIm: boolean;
  isMpim: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useChannels(workspaceId: string | null) {
  const { data, error, isLoading } = useSWR<{ channels: Channel[] }>(
    workspaceId ? `/api/channels?workspaceId=${workspaceId}` : null,
    fetcher
  );

  return {
    channels: data?.channels ?? [],
    isLoading,
    isError: !!error,
  };
}

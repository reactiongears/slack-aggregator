"use client";

import useSWR from "swr";

interface WorkspaceStatus {
  id: string;
  teamId: string;
  name: string;
  color: string;
  icon?: string;
  connected: boolean;
  user?: string;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useWorkspaces() {
  const { data, error, isLoading } = useSWR<{ workspaces: WorkspaceStatus[] }>(
    "/api/workspaces",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    workspaces: data?.workspaces ?? [],
    isLoading,
    isError: !!error,
  };
}

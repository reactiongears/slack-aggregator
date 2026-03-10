"use client";

import useSWR from "swr";
import { AutoReply, CreateAutoReplyRequest, UpdateAutoReplyRequest } from "@/lib/auto-reply/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAutoReplies() {
  const { data, error, isLoading, mutate } = useSWR<{ rules: AutoReply[] }>(
    "/api/auto-replies",
    fetcher,
    { refreshInterval: 30000 }
  );

  const create = async (req: CreateAutoReplyRequest) => {
    const res = await fetch("/api/auto-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error("Failed to create");
    await mutate();
  };

  const update = async (id: string, req: UpdateAutoReplyRequest) => {
    const res = await fetch(`/api/auto-replies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error("Failed to update");
    await mutate();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/auto-replies/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    await mutate();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await update(id, { enabled });
  };

  return {
    rules: data?.rules ?? [],
    isLoading,
    isError: !!error,
    create,
    update,
    remove,
    toggle,
    refresh: () => mutate(),
  };
}

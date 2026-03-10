"use client";

import useSWR from "swr";
import { ScheduledMessage, CreateScheduleRequest, UpdateScheduleRequest } from "@/lib/scheduler/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useScheduledMessages() {
  const { data, error, isLoading, mutate } = useSWR<{ messages: ScheduledMessage[] }>(
    "/api/scheduled-messages",
    fetcher,
    { refreshInterval: 30000 }
  );

  const create = async (req: CreateScheduleRequest) => {
    const res = await fetch("/api/scheduled-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error("Failed to create");
    await mutate();
  };

  const update = async (id: string, req: UpdateScheduleRequest) => {
    const res = await fetch(`/api/scheduled-messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error("Failed to update");
    await mutate();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/scheduled-messages/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    await mutate();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await update(id, { enabled });
  };

  return {
    messages: data?.messages ?? [],
    isLoading,
    isError: !!error,
    create,
    update,
    remove,
    toggle,
    refresh: () => mutate(),
  };
}

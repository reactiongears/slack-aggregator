"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAutoReplies } from "@/hooks/useAutoReplies";
import { AutoReplyForm } from "./AutoReplyForm";
import { AutoReplyList } from "./AutoReplyList";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Workspace {
  id: string;
  name: string;
  color: string;
  connected: boolean;
}

export function AutoReplyContainer() {
  const [showForm, setShowForm] = useState(false);
  const { rules, isLoading, create, toggle, remove } = useAutoReplies();
  const { data: wsData } = useSWR<{ workspaces: Workspace[] }>("/api/workspaces", fetcher);

  const workspaces = (wsData?.workspaces ?? [])
    .filter((ws) => ws.connected)
    .map((ws) => ({ id: ws.id, name: ws.name, color: ws.color }));

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-gray-400 hover:text-gray-200 transition-colors"
            title="Back to feed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </a>
          <h1 className="text-lg font-bold text-gray-100">Auto-Replies</h1>
          {rules.length > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
              {rules.filter((r) => r.enabled && Date.now() >= r.startTime && Date.now() < r.endTime).length} active
            </span>
          )}
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Rule
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {showForm && workspaces.length > 0 && (
          <AutoReplyForm
            workspaces={workspaces}
            onSubmit={async (req) => {
              await create(req);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading...
          </div>
        ) : (
          <AutoReplyList
            rules={rules}
            onToggle={toggle}
            onDelete={remove}
          />
        )}
      </div>
    </div>
  );
}

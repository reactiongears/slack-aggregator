"use client";

import { useEffect, useState } from "react";

interface IgnoreEntry {
  type: "user" | "channel";
  id: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
  addedAt: number;
}

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

export function IgnoreListPanel({ onClose, onChanged }: Props) {
  const [entries, setEntries] = useState<IgnoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIgnores = async () => {
    try {
      const res = await fetch("/api/ignores");
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIgnores();
  }, []);

  const removeEntry = async (entry: IgnoreEntry) => {
    await fetch("/api/ignores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: entry.type,
        id: entry.id,
        workspaceId: entry.workspaceId,
      }),
    });
    setEntries((prev) =>
      prev.filter(
        (e) =>
          !(e.type === entry.type && e.id === entry.id && e.workspaceId === entry.workspaceId)
      )
    );
    onChanged();
  };

  const users = entries.filter((e) => e.type === "user");
  const channels = entries.filter((e) => e.type === "channel");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-[420px] shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-100">
            Ignored List
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No ignored users or channels.<br />
              <span className="text-gray-600 text-xs">
                Right-click a message to ignore a person or channel.
              </span>
            </p>
          ) : (
            <>
              {users.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Ignored Users
                  </p>
                  <div className="space-y-1">
                    {users.map((e) => (
                      <div
                        key={`${e.type}-${e.id}-${e.workspaceId}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-800/50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-300 truncate">{e.name}</p>
                          <p className="text-xs text-gray-600">{e.workspaceName}</p>
                        </div>
                        <button
                          onClick={() => removeEntry(e)}
                          className="shrink-0 text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {channels.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Ignored Channels
                  </p>
                  <div className="space-y-1">
                    {channels.map((e) => (
                      <div
                        key={`${e.type}-${e.id}-${e.workspaceId}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-800/50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-300 truncate">#{e.name}</p>
                          <p className="text-xs text-gray-600">{e.workspaceName}</p>
                        </div>
                        <button
                          onClick={() => removeEntry(e)}
                          className="shrink-0 text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

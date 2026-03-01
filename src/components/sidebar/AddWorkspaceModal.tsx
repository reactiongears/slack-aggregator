"use client";

import { useState, useEffect, useCallback } from "react";

interface Workspace {
  id: string;
  teamId: string;
  name: string;
  domain: string;
  token: string;
}

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

type Step = "idle" | "waiting" | "select" | "saving" | "done" | "error";

export function AddWorkspaceModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [addedNames, setAddedNames] = useState<string[]>([]);

  const startLogin = useCallback(async () => {
    setStep("waiting");
    setError("");
    try {
      const res = await fetch("/api/auth", { method: "POST" });
      if (res.status === 409) {
        setError("A login window is already open.");
        setStep("error");
        return;
      }
    } catch {
      setError("Failed to start login.");
      setStep("error");
    }
  }, []);

  // Poll for auth result while waiting
  useEffect(() => {
    if (step !== "waiting") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth");
        const data = await res.json();

        if (data.status === "done" && data.workspaces) {
          setWorkspaces(data.workspaces);
          setSelected(new Set(data.workspaces.map((w: Workspace) => w.id)));
          setStep("select");
        } else if (data.status === "error") {
          setError(data.error || "Login failed.");
          setStep("error");
        }
      } catch {
        // keep polling
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const toggleWorkspace = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveSelected = async () => {
    setStep("saving");
    try {
      const res = await fetch("/api/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.ok) {
        setAddedNames(data.added);
        setStep("done");
        onAdded();
      } else {
        setError(data.error || "Failed to save.");
        setStep("error");
      }
    } catch {
      setError("Failed to save workspaces.");
      setStep("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-[420px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">
            Add Workspace
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
        <div className="px-5 py-5">
          {step === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                A Chrome window will open to Slack's sign-in page.
                Log into any workspace — we'll detect all workspaces
                linked to your account.
              </p>
              <button
                onClick={startLogin}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Open Slack Login
              </button>
            </div>
          )}

          {step === "waiting" && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 text-center">
                Waiting for you to sign in...<br />
                <span className="text-gray-600 text-xs">
                  Complete the login in the Chrome window that opened
                </span>
              </p>
            </div>
          )}

          {step === "select" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Found {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}. Select which to add:
              </p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {workspaces.map((ws) => (
                  <label
                    key={ws.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(ws.id)}
                      onChange={() => toggleWorkspace(ws.id)}
                      className="w-4 h-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 bg-gray-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {ws.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ws.domain}.slack.com
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={saveSelected}
                disabled={selected.size === 0}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                Add {selected.size} Workspace{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          )}

          {step === "saving" && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Saving configuration...</p>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200">
                  Added {addedNames.length} workspace{addedNames.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {addedNames.join(", ")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-red-400">{error}</p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startLogin}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

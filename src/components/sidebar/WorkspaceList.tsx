import { WorkspaceSummary } from "@/lib/slack/types";
import { WorkspaceBadge } from "./WorkspaceBadge";
import { Badge } from "../ui/Badge";

interface WorkspaceListProps {
  workspaces: WorkspaceSummary[];
  selectedWorkspace?: string;
  onSelect: (id: string | undefined) => void;
  onAddWorkspace: () => void;
}

export function WorkspaceList({
  workspaces,
  selectedWorkspace,
  onSelect,
  onAddWorkspace,
}: WorkspaceListProps) {
  const totalUnread = workspaces.reduce((sum, w) => sum + w.unreadCount, 0);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {/* All workspaces */}
      <button
        onClick={() => onSelect(undefined)}
        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
          !selectedWorkspace
            ? "bg-gray-800 text-gray-100"
            : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
        }`}
      >
        <div className="w-6 h-6 flex items-center justify-center rounded bg-gray-700 shrink-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <span className="text-sm font-medium flex-1 text-left">All</span>
        <Badge count={totalUnread} />
      </button>

      {/* Individual workspaces */}
      {workspaces.map((workspace) => (
        <WorkspaceBadge
          key={workspace.id}
          workspace={workspace}
          isSelected={selectedWorkspace === workspace.id}
          onClick={() =>
            onSelect(
              selectedWorkspace === workspace.id ? undefined : workspace.id
            )
          }
        />
      ))}

      {/* Add workspace */}
      <button
        onClick={onAddWorkspace}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-800/50 hover:text-gray-300 transition-colors mt-1"
      >
        <div className="w-6 h-6 flex items-center justify-center rounded border border-dashed border-gray-600 shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <span className="text-sm">Add Workspace</span>
      </button>
    </div>
  );
}

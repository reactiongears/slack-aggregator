import { WorkspaceSummary } from "@/lib/slack/types";
import { WorkspaceIcon } from "../ui/WorkspaceIcon";
import { Badge } from "../ui/Badge";

interface WorkspaceBadgeProps {
  workspace: WorkspaceSummary;
  isSelected: boolean;
  onClick: () => void;
}

export function WorkspaceBadge({
  workspace,
  isSelected,
  onClick,
}: WorkspaceBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
        isSelected
          ? "bg-gray-800 text-gray-100"
          : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
      }`}
    >
      <WorkspaceIcon name={workspace.name} color={workspace.color} size={6} />
      <span className="text-sm font-medium truncate flex-1 text-left">
        {workspace.name}
      </span>
      {workspace.error ? (
        <span className="text-[10px] text-red-400" title={workspace.error}>
          err
        </span>
      ) : (
        <Badge count={workspace.unreadCount} color={workspace.color} />
      )}
    </button>
  );
}

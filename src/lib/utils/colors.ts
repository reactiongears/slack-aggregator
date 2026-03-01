export const WORKSPACE_COLORS: Record<string, string> = {
  mediabuyer: "#3B82F6",
  salesmade: "#22C55E",
  techstyle: "#A855F7",
  reactiongears: "#F97316",
  teamsmartfix: "#EF4444",
};

export function getWorkspaceColor(workspaceId: string): string {
  return WORKSPACE_COLORS[workspaceId] ?? "#6B7280";
}

// Tailwind-friendly class variants
export const WORKSPACE_BG_CLASSES: Record<string, string> = {
  mediabuyer: "bg-blue-500",
  salesmade: "bg-green-500",
  techstyle: "bg-purple-500",
  reactiongears: "bg-orange-500",
  teamsmartfix: "bg-red-500",
};

export const WORKSPACE_TEXT_CLASSES: Record<string, string> = {
  mediabuyer: "text-blue-400",
  salesmade: "text-green-400",
  techstyle: "text-purple-400",
  reactiongears: "text-orange-400",
  teamsmartfix: "text-red-400",
};

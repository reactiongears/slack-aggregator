export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mb-4 text-gray-600"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <p className="text-lg font-medium text-gray-400">All caught up</p>
      <p className="text-sm mt-1">No unread messages across your workspaces</p>
    </div>
  );
}

interface HeaderProps {
  totalUnread: number;
  onRefresh: () => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({
  totalUnread,
  onRefresh,
  isLoading,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-800 bg-gray-950">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-gray-100">Slack Aggregator</h1>
        {totalUnread > 0 && (
          <span className="text-xs font-semibold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {totalUnread} unread
          </span>
        )}
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700"
          />
        </div>
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
        title="Refresh feed"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={isLoading ? "animate-spin" : ""}
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        Refresh
      </button>
    </header>
  );
}

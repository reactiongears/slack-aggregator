export function FeedSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 px-4 py-3 border-b border-gray-800/50"
        >
          <div className="w-1 shrink-0 rounded-full bg-gray-700" />
          <div className="w-9 h-9 rounded-lg bg-gray-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-3 w-24 bg-gray-700 rounded" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
              <div className="h-3 w-12 bg-gray-800 rounded" />
            </div>
            <div className="h-3 w-3/4 bg-gray-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

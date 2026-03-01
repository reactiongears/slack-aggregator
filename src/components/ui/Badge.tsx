interface BadgeProps {
  count: number;
  color?: string;
  size?: "sm" | "md";
}

export function Badge({ count, color, size = "sm" }: BadgeProps) {
  if (count === 0) return null;

  const display = count > 99 ? "99+" : String(count);
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ${sizeClasses}`}
      style={{ backgroundColor: color ?? "#EF4444" }}
    >
      {display}
    </span>
  );
}

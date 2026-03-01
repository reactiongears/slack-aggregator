interface WorkspaceIconProps {
  name: string;
  color: string;
  size?: number;
}

export function WorkspaceIcon({ name, color, size = 8 }: WorkspaceIconProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="flex items-center justify-center rounded font-bold text-white shrink-0"
      style={{
        backgroundColor: color,
        width: `${size * 4}px`,
        height: `${size * 4}px`,
        fontSize: `${size * 1.5}px`,
      }}
    >
      {initial}
    </div>
  );
}

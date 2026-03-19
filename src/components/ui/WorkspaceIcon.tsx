"use client";

import { useState } from "react";

interface WorkspaceIconProps {
  name: string;
  color: string;
  icon?: string;
  size?: number;
}

export function WorkspaceIcon({ name, color, icon, size = 8 }: WorkspaceIconProps) {
  const [imgError, setImgError] = useState(false);
  const initial = name.charAt(0).toUpperCase();
  const px = size * 4;

  if (icon && !imgError) {
    return (
      <img
        src={icon}
        alt={name}
        width={px}
        height={px}
        className="rounded shrink-0"
        style={{ width: `${px}px`, height: `${px}px` }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded font-bold text-white shrink-0"
      style={{
        backgroundColor: color,
        width: `${px}px`,
        height: `${px}px`,
        fontSize: `${size * 1.5}px`,
      }}
    >
      {initial}
    </div>
  );
}

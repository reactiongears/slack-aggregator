interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
}

export function Avatar({ src, alt, size = 36 }: AvatarProps) {
  if (!src) {
    // Fallback: colored circle with initial
    const initial = alt.charAt(0).toUpperCase();
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-gray-600 text-white font-medium text-sm shrink-0"
        style={{ width: size, height: size }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-lg shrink-0 object-cover"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  );
}

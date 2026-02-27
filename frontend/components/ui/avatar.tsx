import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import Image from "next/image";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  colorSeed?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2',
];

export function getColorFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({
  src,
  alt = "Avatar",
  fallback,
  size = "md",
  className,
  colorSeed,
  ...props
}: AvatarProps) {
  const initials = fallback
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bgColor = !src ? getColorFromSeed(colorSeed || fallback || "?") : undefined;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full overflow-hidden",
        src ? "bg-muted text-muted-foreground" : "text-white",
        sizeClasses[size],
        className
      )}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <span className="font-medium">{initials || "?"}</span>
      )}
    </div>
  );
}

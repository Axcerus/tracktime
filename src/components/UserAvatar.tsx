"use client";

import { useState } from "react";
import Image from "next/image";

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showOnlineDot?: boolean;
  isOnline?: boolean;
  priority?: boolean;
}

const SIZE_MAP = {
  xs: {
    container: "w-6 h-6",
    text: "text-[9.5px]",
    dot: "w-1.5 h-1.5 -bottom-0.5 -right-0.5",
    dimension: 24,
  },
  sm: {
    container: "w-7.5 h-7.5",
    text: "text-[11.5px]",
    dot: "w-2 h-2 -bottom-0.5 -right-0.5",
    dimension: 30,
  },
  md: {
    container: "w-8.5 h-8.5",
    text: "text-[13px]",
    dot: "w-2 h-2 -bottom-0.5 -right-0.5",
    dimension: 34,
  },
  lg: {
    container: "w-11 h-11",
    text: "text-[17px]",
    dot: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
    dimension: 44,
  },
  xl: {
    container: "w-18 h-18",
    text: "text-[26px]",
    dot: "w-3.5 h-3.5 bottom-0 right-0",
    dimension: 72,
  },
};

export default function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
  showOnlineDot = false,
  isOnline = false,
  priority = false,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const sizeConfig = SIZE_MAP[size];

  const showImage = Boolean(avatarUrl && !hasError);

  return (
    <div className={`relative shrink-0 ${sizeConfig.container} ${className}`}>
      <div
        className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center font-bold select-none transition-all ${
          showImage
            ? "bg-[#ede8df] border border-[#e5e0d8]"
            : "bg-[#ede8df] text-[#26201b] border border-[#e5e0d8]/80"
        }`}
      >
        {showImage ? (
          <Image
            src={avatarUrl as string}
            alt={`${name}'s profile photo`}
            width={sizeConfig.dimension}
            height={sizeConfig.dimension}
            unoptimized
            priority={priority}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={`${sizeConfig.text} leading-none tracking-tight`}>
            {initial}
          </span>
        )}
      </div>

      {showOnlineDot && isOnline && (
        <span
          className={`online-dot absolute ring-2 ring-[#fbf9f5] ${sizeConfig.dot}`}
          title="Online"
        />
      )}
    </div>
  );
}

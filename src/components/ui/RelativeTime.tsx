"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/utils/time";

interface RelativeTimeProps {
  timestamp: number;
}

export function RelativeTime({ timestamp }: RelativeTimeProps) {
  const [display, setDisplay] = useState(relativeTime(timestamp));

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(relativeTime(timestamp));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <time
      dateTime={new Date(timestamp).toISOString()}
      className="text-xs text-gray-500 whitespace-nowrap"
      title={new Date(timestamp).toLocaleString()}
    >
      {display}
    </time>
  );
}

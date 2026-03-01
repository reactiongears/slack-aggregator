"use client";

import { useEffect, useRef } from "react";

const BADGE_BG = "#ef4444";
const BADGE_TEXT = "#ffffff";
const ICON_SIZE = 32;

function drawFavicon(count: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext("2d")!;

  // Base icon: rounded purple square with "S" (Slack-ish)
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.roundRect(0, 0, ICON_SIZE, ICON_SIZE, 6);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", ICON_SIZE / 2, ICON_SIZE / 2 + 1);

  // Badge
  if (count > 0) {
    const label = count > 99 ? "99+" : String(count);
    const badgeRadius = label.length > 2 ? 11 : 9;
    const bx = ICON_SIZE - badgeRadius;
    const by = badgeRadius;

    // Red circle
    ctx.fillStyle = BADGE_BG;
    ctx.beginPath();
    ctx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
    ctx.fill();

    // White text
    ctx.fillStyle = BADGE_TEXT;
    ctx.font = `bold ${label.length > 2 ? 9 : 11}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx, by + 0.5);
  }

  return canvas.toDataURL("image/png");
}

export function useFavicon(count: number) {
  const linkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    // Find or create the favicon link element
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    linkRef.current = link;

    link.href = drawFavicon(count);
  }, [count]);
}

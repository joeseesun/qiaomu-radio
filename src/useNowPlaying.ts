import { useEffect, useState } from "react";
import type { Station } from "./types";

export type NowPlaying = { title: string; artist: string; album: string; updatedAt: number };
export function somaChannel(station: Station | null) {
  if (!station) return null;
  try {
    const url = new URL(station.streamUrl);
    if (url.hostname !== "somafm.com" && !url.hostname.endsWith(".somafm.com")) return null;
    return url.pathname.match(/^\/([a-z0-9]+)(?:[-/]|$)/)?.[1] || null;
  } catch { return null; }
}
export function useNowPlaying(station: Station | null) {
  const [entry, setEntry] = useState<{ id: string; track: NowPlaying } | null>(null);
  const channel = somaChannel(station);
  useEffect(() => {
    const controller = new AbortController();
    if (!channel || !station) return;
    const read = async () => {
      try {
        const response = await fetch(`/api/now-playing?channel=${encodeURIComponent(channel)}`, { signal: controller.signal });
        const data = await response.json();
        if (!controller.signal.aborted) setEntry(response.ok && data.track ? { id: station.id, track: data.track } : null);
      } catch { if (!controller.signal.aborted) setEntry(null); }
    };
    void read();
    const timer = window.setInterval(read, 25000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [channel, station?.id]);
  return entry?.id === station?.id ? entry?.track || null : null;
}

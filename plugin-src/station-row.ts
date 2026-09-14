import type { Station } from "./types";

export interface StationRowContent {
  /** 1-based table position, replaced by an equalizer icon while playing. */
  index: number;
  name: string;
  detail: string;
  quality: string;
  likeLabel: string;
  liked: boolean;
}

/**
 * Content contract for one Spotify-style list row. The view only paints this
 * data, so table columns, accessible names and tooltip-free labels stay testable
 * without a DOM.
 */
export function stationRowContent(station: Station, index: number, liked: boolean): StationRowContent {
  return {
    index: index + 1,
    name: station.name,
    detail: [station.country || "全球", station.tags[0]].filter(Boolean).join(" · "),
    quality: [station.codec, station.bitrate ? `${station.bitrate}k` : ""].filter(Boolean).join(" · ") || "LIVE",
    likeLabel: liked ? `取消喜欢 ${station.name}` : `喜欢 ${station.name}`,
    liked,
  };
}

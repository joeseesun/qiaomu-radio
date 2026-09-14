import type { Station } from "./types";

export interface StationRowContent {
  /** 1-based list position, replaced by an equalizer icon while playing. */
  index: number;
  name: string;
  /** Secondary line: where the station is from, what it plays, and how it sounds. */
  meta: string;
  genre: string;
  quality: string;
  likeLabel: string;
  liked: boolean;
}

/**
 * Content contract for one list row. The view only paints this data, so column
 * layout, accessible names and tooltip-free labels stay testable without a DOM.
 */
export function stationRowContent(station: Station, index: number, liked: boolean): StationRowContent {
  const genre = station.tags[0] ?? "";
  const quality = [station.codec, station.bitrate ? `${station.bitrate}k` : ""].filter(Boolean).join(" · ") || "LIVE";
  const meta = [station.country || "全球", genre || quality].filter(Boolean).join(" · ");
  return {
    index: index + 1,
    name: station.name,
    meta,
    genre,
    quality,
    likeLabel: liked ? `取消喜欢 ${station.name}` : `喜欢 ${station.name}`,
    liked,
  };
}

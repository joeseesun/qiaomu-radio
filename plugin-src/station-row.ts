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

const CODE_QUALITY = /^(?:mp3|aac\+?|ogg|opus|hls|hls2|unknown|live)$/i;
const BITRATE_QUALITY = /\d{1,3}\s?k(?:bps)?$/i;
const TRAILING_BRACKET = /\s*[([{][^)\]}]{0,60}[)\]}]$/;
const MAX_NAME_LENGTH = 64;

function isQualityToken(token: string): boolean {
  const value = token.replace(/[,·|]/g, "").trim();
  return value.length > 0 && (CODE_QUALITY.test(value) || BITRATE_QUALITY.test(value));
}

/**
 * Radio Browser names carry provider decoration such as `___LOUNGE__ by tmr`,
 * `(128k mp3)` or `[rm.fm]`. Strip only that decoration so the list stays
 * readable, and never invent words the directory did not provide.
 */
export function cleanStationName(raw: string): string {
  let name = raw.replace(/\s+/g, " ").trim();
  let previous = "";
  while (previous !== name) {
    previous = name;
    const bracket = name.match(TRAILING_BRACKET);
    if (bracket) {
      const parts = bracket[0].slice(1, -1).split(/[\s,·|]+/).filter(Boolean);
      if (parts.length > 0 && parts.every(isQualityToken)) {
        name = name.slice(0, name.length - bracket[0].length).trim();
        continue;
      }
    }
    const tokens = name.split(" ");
    let removed = 0;
    while (tokens.length - removed > 1 && isQualityToken(tokens[tokens.length - 1 - removed] ?? "")) removed += 1;
    if (removed > 0) name = tokens.slice(0, tokens.length - removed).join(" ").trim();
  }
  name = name.replace(/^[_\-\s|·]+/, "").replace(/[_\-\s|·]+$/, "").trim();
  name = name.replace(/_{2,}/g, " ").replace(/\s+/g, " ").trim();
  if (name.length <= MAX_NAME_LENGTH) return name;
  const cut = name.slice(0, MAX_NAME_LENGTH);
  const at = cut.lastIndexOf(" ");
  return `${(at > 24 ? cut.slice(0, at) : cut).trimEnd()}…`;
}

/**
 * Content contract for one list row. The view only paints this data, so column
 * layout, accessible names and tooltip-free labels stay testable without a DOM.
 */
export function stationRowContent(station: Station, index: number, liked: boolean): StationRowContent {
  const name = cleanStationName(station.name) || station.name;
  const genre = station.tags[0] ?? "";
  const quality = [station.codec, station.bitrate ? `${station.bitrate}k` : ""].filter(Boolean).join(" · ") || "LIVE";
  const meta = [station.country || "全球", genre || quality].filter(Boolean).join(" · ");
  return {
    index: index + 1,
    name,
    meta,
    genre,
    quality,
    likeLabel: liked ? `取消喜欢 ${name}` : `喜欢 ${name}`,
    liked,
  };
}

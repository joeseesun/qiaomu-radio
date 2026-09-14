import { requestUrl } from "obsidian";
import type { MoodId, Station } from "./types";
import type { DirectoryFilter } from "./catalog";
import { DirectoryCache } from "./directory-cache";

const QIAOMU_API = "https://radio.qiaomu.ai";
const RADIO_BROWSER_APIS = [
  "https://de1.api.radio-browser.info/json",
  "https://nl1.api.radio-browser.info/json",
  "https://fi1.api.radio-browser.info/json",
];

const MOOD_TAGS: Record<Exclude<MoodId, "recommend">, string[]> = {
  focus: ["ambient", "chillout", "instrumental"],
  unwind: ["soul", "lounge", "easy listening"],
  jazz: ["jazz"],
  classical: ["classical"],
  energy: ["rock", "dance", "electronic"],
  world: ["world", "folk", "international"],
};

interface QiaomuResponse {
  stations?: Station[];
  warning?: string;
}

interface RadioBrowserStation {
  stationuuid?: unknown;
  name?: unknown;
  url?: unknown;
  url_resolved?: unknown;
  homepage?: unknown;
  favicon?: unknown;
  tags?: unknown;
  country?: unknown;
  countrycode?: unknown;
  language?: unknown;
  codec?: unknown;
  bitrate?: unknown;
  votes?: unknown;
  clickcount?: unknown;
  lastcheckok?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanStation(raw: RadioBrowserStation): Station | null {
  const id = text(raw.stationuuid);
  const name = text(raw.name);
  const streamUrl = text(raw.url_resolved) || text(raw.url);
  if (!id || !name || !streamUrl.startsWith("https://") || number(raw.lastcheckok) !== 1) return null;
  return {
    id,
    name,
    streamUrl,
    homepage: text(raw.homepage),
    favicon: text(raw.favicon),
    tags: text(raw.tags).split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
    country: text(raw.country) || "未知地区",
    countryCode: text(raw.countrycode).toUpperCase(),
    language: text(raw.language),
    codec: text(raw.codec) || "LIVE",
    bitrate: number(raw.bitrate),
    votes: number(raw.votes),
    clickCount: number(raw.clickcount),
  };
}

function deduplicate(stations: Station[]): Station[] {
  const ids = new Set<string>();
  const streams = new Set<string>();
  return stations.filter(station => {
    if (!station.id || !station.name || !station.streamUrl || ids.has(station.id) || streams.has(station.streamUrl)) return false;
    ids.add(station.id);
    streams.add(station.streamUrl);
    return true;
  });
}

export class RadioService {
  private cache = new DirectoryCache<{ stations: Station[]; notice: string }>();

  private key(mood: MoodId, query: string, filter: DirectoryFilter): string {
    return JSON.stringify([query ? "search" : filter.tag || (mood === "recommend" ? "focus" : mood), query.trim().toLowerCase(), filter.country || "", filter.language || ""]);
  }

  cached(mood: MoodId, query = "", filter: DirectoryFilter = {}): { stations: Station[]; notice: string } | undefined {
    return this.cache.peek(this.key(mood, query, filter));
  }

  stations(mood: MoodId, query = "", filter: DirectoryFilter = {}): Promise<{ stations: Station[]; notice: string }> {
    return this.cache.get(this.key(mood, query, filter), () => this.fetchStations(mood, query.trim(), filter));
  }

  private async fetchStations(mood: MoodId, query: string, filter: DirectoryFilter): Promise<{ stations: Station[]; notice: string }> {
    const effectiveMood = mood === "recommend" ? "focus" : mood;
    try {
      const stations = await this.fromRadioBrowser(effectiveMood, query, filter);
      return { stations, notice: "" };
    } catch {
      // Continue with Qiaomu's reviewed fallback directory.
    }

    // The fallback endpoint cannot express these filters. Never return unrelated stations.
    if (filter.tag || filter.country || filter.language) throw new Error("暂时联系不上分类目录，请重试或切换分类。");

    const params = new URLSearchParams({ mood: effectiveMood, q: query });
    const response = await requestUrl({ url: `${QIAOMU_API}/api/stations?${params.toString()}` });
    const payload = response.json as QiaomuResponse;
    const stations = deduplicate(payload.stations ?? []).filter((station) => station.streamUrl.startsWith("https://"));
    if (stations.length === 0) throw new Error("暂时联系不上全球电台目录。");
    return { stations, notice: payload.warning ?? "已切换到乔木电台的备用目录。" };
  }

  async streamUrl(station: Station): Promise<string> {
    if (!/^(?:cn|global)-/.test(station.id)) return station.streamUrl;
    try {
      const response = await requestUrl({ url: `${QIAOMU_API}/api/play/${encodeURIComponent(station.id)}` });
      const value = text((response.json as { url?: unknown }).url);
      if (value.startsWith("/")) return `${QIAOMU_API}${value}`;
      if (value.startsWith("https://")) return value;
    } catch {
      // The station's reviewed URL is still a valid fallback.
    }
    return station.streamUrl;
  }

  private async fromRadioBrowser(mood: Exclude<MoodId, "recommend">, query: string, filter: DirectoryFilter): Promise<Station[]> {
    let lastError: unknown;
    for (const base of RADIO_BROWSER_APIS) {
      try {
        const params = new URLSearchParams({
          hidebroken: "true",
          limit: "60",
          order: "clickcount",
          tagExact: "true",
          languageExact: "true",
          reverse: "true",
        });
        if (query) params.set("name", query.slice(0, 80));
        else if (filter.tag || (!filter.country && !filter.language)) params.set("tag", filter.tag || MOOD_TAGS[mood][0] || "music");
        if (filter.country) params.set("countrycode", filter.country);
        if (filter.language) params.set("language", filter.language);
        const response = await requestUrl({ url: `${base}/stations/search?${params.toString()}` });
        const raw = Array.isArray(response.json) ? response.json as RadioBrowserStation[] : [];
        const stations = deduplicate(raw.map(cleanStation).filter((item): item is Station => item !== null));
        if (Array.isArray(response.json)) return stations;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("暂时联系不上全球电台目录。");
  }
}

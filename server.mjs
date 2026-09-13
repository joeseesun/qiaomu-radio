import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 4173);
const app = express();

const USER_AGENT = "QiaomuRadio/0.1 (+https://www.radio-browser.info/)";
const MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
];
const MOOD_TAGS = {
  unwind: ["chillout", "lounge", "easy listening"],
  focus: ["ambient", "downtempo", "instrumental"],
  jazz: ["jazz", "smooth jazz", "soul"],
  classical: ["classical", "baroque", "opera"],
  energy: ["rock", "indie", "alternative"],
  world: ["world", "folk", "latin"],
};

// Curated broadcaster-owned HTTPS streams. We intentionally do not scrape
// closed aggregators or ingest unlicensed playlist mirrors at runtime.
const CHINA_STATIONS = [
  {
    id: "cn-cnr-voice-of-china",
    name: "央广中国之声",
    streamUrl: "https://ngcdn001.cnr.cn/live/zgzs/index.m3u8",
    homepage: "https://www.cnr.cn/",
    favicon: "",
    tags: ["新闻", "综合", "央广"],
    country: "中国",
    countryCode: "CN",
    language: "普通话",
    codec: "HLS",
    bitrate: 0,
    votes: 100,
    clickCount: 100,
    source: "china-curated",
  },
  {
    id: "cn-cnr-economy",
    name: "央广经济之声",
    streamUrl: "https://ngcdn002.cnr.cn/live/jjzs/index.m3u8",
    homepage: "https://www.cnr.cn/",
    favicon: "",
    tags: ["财经", "新闻", "央广"],
    country: "中国",
    countryCode: "CN",
    language: "普通话",
    codec: "HLS",
    bitrate: 0,
    votes: 90,
    clickCount: 90,
    source: "china-curated",
  },
  {
    id: "cn-brtv-music",
    name: "北京音乐广播 FM97.4",
    streamUrl: "https://brtv-radiolive.rbc.cn/alive/fm974.m3u8",
    homepage: "https://www.brtv.org.cn/",
    favicon: "",
    tags: ["音乐", "流行", "北京"],
    country: "中国",
    countryCode: "CN",
    language: "普通话",
    codec: "HLS",
    bitrate: 0,
    votes: 86,
    clickCount: 86,
    source: "china-curated",
  },
  {
    id: "cn-brtv-traffic",
    name: "北京交通广播 FM103.9",
    streamUrl: "https://brtv-radiolive.rbc.cn/alive/fm1039.m3u8",
    homepage: "https://www.brtv.org.cn/",
    favicon: "",
    tags: ["交通", "城市", "北京"],
    country: "中国",
    countryCode: "CN",
    language: "普通话",
    codec: "HLS",
    bitrate: 0,
    votes: 82,
    clickCount: 82,
    source: "china-curated",
  },
  {
    id: "cn-cri-south-sea",
    name: "CRI 南海之声",
    streamUrl: "https://sk.cri.cn/nhzs.m3u8",
    homepage: "https://news.cri.cn/",
    favicon: "",
    tags: ["国际", "资讯", "华语"],
    country: "中国",
    countryCode: "CN",
    language: "普通话",
    codec: "HLS",
    bitrate: 0,
    votes: 78,
    clickCount: 78,
    source: "china-curated",
  },
  {
    id: "cn-hebei-youth-music",
    name: "河北青年音乐广播",
    streamUrl: "https://radio.pull.hebtv.com/live/hebqcyy.m3u8",
    homepage: "https://www.hebtv.com/",
    favicon: "",
    tags: ["音乐", "青年", "河北"],
    country: "中国",
    countryCode: "CN",
    language: "普通话",
    codec: "HLS",
    bitrate: 0,
    votes: 74,
    clickCount: 74,
    source: "china-curated",
  },
  {
    id: "cn-rthk-radio-3",
    name: "香港电台第三台",
    streamUrl: "https://rthkradio3-live.akamaized.net/hls/live/2040079/radio3/master.m3u8",
    homepage: "https://www.rthk.hk/",
    favicon: "",
    tags: ["香港", "英语", "综合"],
    country: "中国香港",
    countryCode: "HK",
    language: "英语",
    codec: "HLS",
    bitrate: 0,
    votes: 70,
    clickCount: 70,
    source: "china-curated",
  },
];
const cache = new Map();

function cleanStation(station) {
  return {
    id: station.stationuuid,
    name: String(station.name || "未命名电台").trim(),
    streamUrl: station.url_resolved || station.url,
    homepage: station.homepage || "",
    favicon: station.favicon || "",
    tags: String(station.tags || "")
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12),
    country: station.country || station.countrycode || "未知地区",
    countryCode: station.countrycode || "",
    language: station.language || "未知语言",
    codec: station.codec || "",
    bitrate: Number(station.bitrate || 0),
    votes: Number(station.votes || 0),
    clickCount: Number(station.clickcount || 0),
    source: "radio-browser",
  };
}

async function radioFetch(pathname) {
  let lastError;
  for (const mirror of MIRRORS) {
    try {
      const response = await fetch(`${mirror}${pathname}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(6500),
      });
      if (!response.ok) throw new Error(`Radio Browser 返回 ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Radio Browser 暂时不可用");
}

app.get("/api/stations", async (request, response) => {
  const mood = String(request.query.mood || "focus");
  const query = String(request.query.q || "").trim().slice(0, 80);
  const source = String(request.query.source || "radio-browser");
  if (source === "china-curated") {
    const normalizedQuery = query.toLowerCase();
    const stations = normalizedQuery
      ? CHINA_STATIONS.filter((station) =>
          [station.name, station.country, station.language, ...station.tags].join(" ").toLowerCase().includes(normalizedQuery),
        )
      : CHINA_STATIONS;
    return response.json({ stations, cached: true, source: "china-curated" });
  }

  const cacheKey = `${source}:${mood}:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) {
    return response.json({ stations: cached.stations, cached: true });
  }

  try {
    const base = new URLSearchParams({ hidebroken: "true", limit: "40", order: query ? "clickcount" : "random", reverse: query ? "true" : "false" });
    let raw;
    if (query) {
      base.set("name", query);
      raw = await radioFetch(`/json/stations/search?${base}`);
    } else {
      const tagResults = await Promise.all(
        (MOOD_TAGS[mood] || MOOD_TAGS.focus).map((tag) => {
          const tagParams = new URLSearchParams(base);
          tagParams.set("tag", tag);
          tagParams.set("tagExact", "false");
          return radioFetch(`/json/stations/search?${tagParams}`);
        }),
      );
      raw = Array.from(new Map(tagResults.flat().map((station) => [station.stationuuid, station])).values());
    }
    const stations = raw
      .map(cleanStation)
      .filter((station) => station.id && /^https?:\/\//.test(station.streamUrl));
    cache.set(cacheKey, { at: Date.now(), stations });
    response.json({ stations, cached: false });
  } catch (error) {
    const normalizedQuery = query.toLowerCase();
    const fallbackStations = normalizedQuery
      ? CHINA_STATIONS.filter((station) =>
          [station.name, station.country, station.language, ...station.tags].join(" ").toLowerCase().includes(normalizedQuery),
        )
      : CHINA_STATIONS;
    if (fallbackStations.length) {
      return response.json({
        stations: fallbackStations,
        cached: true,
        source: "china-fallback",
        warning: "全球电台目录暂时不可用，已切换到中国公开电台。",
      });
    }
    response.status(502).json({
      error: "暂时联系不上全球电台目录，请稍后重试。",
      detail: error instanceof Error ? error.message : "unknown error",
    });
  }
});

app.get("/api/play/:stationId", async (request, response) => {
  const stationId = request.params.stationId;
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(stationId)) {
    return response.status(400).json({ error: "电台标识无效。" });
  }
  const curatedStation = CHINA_STATIONS.find((station) => station.id === stationId);
  if (curatedStation) {
    return response.json({ url: curatedStation.streamUrl, ok: true, source: "china-curated" });
  }
  try {
    const result = await radioFetch(`/json/url/${encodeURIComponent(stationId)}`);
    response.json({ url: result.url, ok: Boolean(result.ok) });
  } catch (error) {
    response.status(502).json({ error: "这家电台暂时无法连接，可以试试下一家。" });
  }
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, sources: ["Radio Browser", "China curated broadcaster streams"], cacheEntries: cache.size, chinaStations: CHINA_STATIONS.length });
});

const songCache = new Map();
app.get("/api/now-playing", async (request, response) => {
  const channel = String(request.query.channel || "");
  if (!/^[a-z0-9]{1,32}$/.test(channel)) return response.status(400).json({ track: null });
  const cached = songCache.get(channel);
  if (cached && Date.now() - cached.at < 20000) return response.json(cached.data);
  try {
    const upstream = await fetch(`https://somafm.com/songs/${channel}.json`, { signal: AbortSignal.timeout(6000) });
    if (!upstream.ok) return response.json({ track: null });
    const data = await upstream.json();
    const song = data.songs?.[0];
    const updatedAt = Number(song?.date) * 1000;
    const fresh = Number.isFinite(updatedAt) && Date.now() - updatedAt < 30 * 60 * 1000 && updatedAt <= Date.now() + 60000;
    const result = { track: fresh && song?.title ? { title: String(song.title), artist: String(song.artist || ""), album: String(song.album || ""), updatedAt } : null };
    if (songCache.size > 100) songCache.clear();
    songCache.set(channel, { at: Date.now(), data: result });
    response.json(result);
  } catch { response.json({ track: null }); }
});

if (isDev) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(root, "dist")));
  app.use((_request, response) => response.sendFile(path.join(root, "dist", "index.html")));
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Qiaomu Radio ${isDev ? "dev" : "production"} server: http://127.0.0.1:${port}`);
});

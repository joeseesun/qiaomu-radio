import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { GLOBAL_CURATED_STATIONS, clientIp, countryCode, selectPopularMusic } from "./serverPolicy.mjs";
import { isHlsStream, mergeHlsPlaylist } from "./hlsRelay.mjs";

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
const playCache = new Map();
const regionCache = new Map();
const regionalStationCache = new Map();
const hlsSessions = new Map();
const REGIONAL_CACHE_FRESH_MS = 15 * 60 * 1000;
const REGIONAL_CACHE_STALE_MS = 24 * 60 * 60 * 1000;

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

async function requestCountry(request) {
  const fromEdge = countryCode(request.headers["cf-ipcountry"] || request.headers["x-country-code"]);
  if (fromEdge) return fromEdge;
  const ip = clientIp(request);
  if (!ip) return null;
  const key = createHash("sha256").update(ip).digest("hex");
  const cached = regionCache.get(key);
  if (cached && Date.now() - cached.at < 24 * 60 * 60 * 1000) return cached.code;
  try {
    const result = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(2500) });
    const data = result.ok ? await result.json() : null;
    const code = countryCode(data?.country);
    if (regionCache.size > 1000) regionCache.clear();
    regionCache.set(key, { at: Date.now(), code });
    return code;
  } catch { return null; }
}

async function globalPopularStations() {
  try {
    const raw = await radioFetch("/json/stations/topvote/200?hidebroken=true");
    const selected = selectPopularMusic(raw, 20).map(cleanStation);
    if (selected.length < 12) return GLOBAL_CURATED_STATIONS;
    const selectedUrls = new Set(selected.map((station) => station.streamUrl));
    return [...selected, ...GLOBAL_CURATED_STATIONS.filter((station) => !selectedUrls.has(station.streamUrl))].slice(0, 20);
  } catch { return GLOBAL_CURATED_STATIONS; }
}

async function regionalStations(request) {
  const code = countryCode(request.query.country) || await requestCountry(request);
  if (!code) return { stations: await globalPopularStations(), countryCode: null, source: "global-fallback", cached: true };
  if (code === "CN") return { stations: CHINA_STATIONS, countryCode: code, source: "china-curated", cached: true };
  const cached = regionalStationCache.get(code);
  if (cached && Date.now() - cached.at < REGIONAL_CACHE_FRESH_MS) {
    return { stations: cached.stations, countryCode: code, source: "regional", cached: true };
  }
  try {
    const params = new URLSearchParams({ countrycode: code, hidebroken: "true", limit: "80", order: "votes", reverse: "true" });
    const raw = await radioFetch(`/json/stations/search?${params}`);
    const music = selectPopularMusic(raw, 20).map(cleanStation);
    if (music.length >= 5) {
      regionalStationCache.set(code, { at: Date.now(), stations: music });
      if (regionalStationCache.size > 80) regionalStationCache.delete(regionalStationCache.keys().next().value);
      return { stations: music, countryCode: code, source: "regional", cached: false };
    }
  } catch { /* fall through to global list */ }
  if (cached && Date.now() - cached.at < REGIONAL_CACHE_STALE_MS) {
    return { stations: cached.stations, countryCode: code, source: "regional-stale", cached: true, warning: "地区目录暂时波动，已继续使用最近成功的电台列表。" };
  }
  return { stations: await globalPopularStations(), countryCode: code, source: "global-fallback", cached: true };
}

app.get("/api/stations", async (request, response) => {
  const mood = String(request.query.mood || "focus");
  const query = String(request.query.q || "").trim().slice(0, 80);
  const source = String(request.query.source || "radio-browser");
  if (source === "global-curated") {
    return response.json({ stations: await globalPopularStations(), cached: false, source: "global-curated" });
  }
  if (source === "regional") {
    const regional = await regionalStations(request);
    return response.json(regional);
  }
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
  const curatedStation = [...CHINA_STATIONS, ...GLOBAL_CURATED_STATIONS].find((station) => station.id === stationId);
  if (curatedStation) {
    if (isHlsStream(curatedStation.streamUrl)) void warmHls(stationId);
    const url = isHlsStream(curatedStation.streamUrl) ? `/api/hls/${encodeURIComponent(stationId)}/index.m3u8` : curatedStation.streamUrl;
    return response.json({ url, ok: true, source: curatedStation.source });
  }
  const cached = playCache.get(stationId);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return response.json({ url: cached.url, ok: true, cached: true });
  try {
    const result = await radioFetch(`/json/url/${encodeURIComponent(stationId)}`);
    if (result.url) {
      if (playCache.size > 500) playCache.clear();
      playCache.set(stationId, { at: Date.now(), url: result.url });
    }
    response.json({ url: result.url, ok: Boolean(result.ok) });
  } catch (error) {
    response.status(502).json({ error: "这家电台暂时无法连接，可以试试下一家。" });
  }
});

function hlsSession(stationId) {
  const station = CHINA_STATIONS.find((item) => item.id === stationId && isHlsStream(item.streamUrl));
  if (!station) return null;
  let session = hlsSessions.get(stationId);
  if (!session) { session = { source: station.streamUrl, resources: new Map(), segments: new Map(), history: new Map(), warming: false }; hlsSessions.set(stationId, session); }
  return session;
}

async function cachedSegment(session, token, url) {
  const existing = session.segments.get(token);
  if (existing && Date.now() - existing.at < 90_000) return existing.promise;
  const promise = fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) }).then(async (upstream) => {
    if (!upstream.ok) throw new Error(`HLS segment ${upstream.status}`);
    return { body: Buffer.from(await upstream.arrayBuffer()), type: upstream.headers.get("content-type") || "video/mp2t" };
  });
  session.segments.set(token, { at: Date.now(), promise });
  if (session.segments.size > 60) session.segments.delete(session.segments.keys().next().value);
  return promise;
}

async function refreshHls(session, stationId, source = session.source) {
  const upstream = await fetch(source, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(6500) });
  if (!upstream.ok) throw new Error(`HLS playlist ${upstream.status}`);
  const merged = mergeHlsPlaylist(await upstream.text(), source, stationId, (key, url) => session.resources.set(key, url), session.history);
  for (const [key, url] of session.resources) if (!isHlsStream(url)) void cachedSegment(session, key, url).catch(() => {});
  return merged.body;
}

async function warmHls(stationId) {
  const session = hlsSession(stationId);
  if (!session || session.warming) return;
  session.warming = true;
  try {
    for (let i=0;i<10;i+=1) { await refreshHls(session, stationId); await new Promise((resolve) => setTimeout(resolve, 900)); }
  } catch { /* playback request can retry */ }
  finally { session.warming = false; }
}

app.get("/api/hls/:stationId/:resource", async (request, response) => {
  const stationId = request.params.stationId;
  const session = hlsSession(stationId);
  if (!session) return response.status(404).end();
  const resource = request.params.resource;
  try {
    if (resource.endsWith(".m3u8")) {
      const token = resource.slice(0, -5);
      const source = token === "index" ? session.source : session.resources.get(token);
      if (!source || !isHlsStream(source)) return response.status(404).end();
      const body = await refreshHls(session, stationId, source);
      response.set({ "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" }).send(body);
      return;
    }
    const token = resource.replace(/\.(?:ts|aac|m4s|mp4)$/, "");
    const url = session.resources.get(token);
    if (!url) return response.status(404).end();
    const segment = await cachedSegment(session, token, url);
    response.set({ "Content-Type": segment.type, "Cache-Control": "public, max-age=90" }).send(segment.body);
  } catch { response.status(502).end(); }
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, sources: ["Radio Browser", "China curated broadcaster streams", "Global curated music fallback"], cacheEntries: cache.size, regionalCacheEntries: regionalStationCache.size, playCacheEntries: playCache.size, chinaStations: CHINA_STATIONS.length, globalFallbackStations: GLOBAL_CURATED_STATIONS.length });
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
  app.use(express.static(path.join(root, "dist"), {
    setHeaders(response, filePath) {
      if (/[\\/]models[\\/].*-v\d+\.glb$/i.test(filePath)) response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      else if (/\.(?:glb|png|webp)$/i.test(filePath)) response.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    },
  }));
  app.use((_request, response) => response.sendFile(path.join(root, "dist", "index.html")));
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Qiaomu Radio ${isDev ? "dev" : "production"} server: http://127.0.0.1:${port}`);
});

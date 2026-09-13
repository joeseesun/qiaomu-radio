import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { PlayerSkin } from "./PlayerSkin";
import { applyFeedback, EMPTY_PROFILE, rankStations, recordStationOutcome } from "./recommendation";
import { getTheme } from "./themes";
import { ThemePicker } from "./ThemePicker";
import type { MoodId, Station, StationSource, TasteProfile, ThemeId } from "./types";
import { HLS_RADIO_CONFIG, PREFETCH_STATION_COUNT, STREAM_URL_CACHE_MS } from "./playbackPolicy";
import { loadHlsRuntime } from "./hlsRuntime";
import { useI18n, type MessageKey } from "./i18n";

const MOODS: Array<{ id: MoodId; label: string; note: string; accent: string }> = [
  { id: "unwind", label: "松一口气", note: "轻柔、松弛、缓慢", accent: "#d75f3b" },
  { id: "focus", label: "安静做事", note: "氛围、器乐、低干扰", accent: "#2f6f69" },
  { id: "jazz", label: "爵士时刻", note: "爵士、灵魂、即兴", accent: "#a66a26" },
  { id: "classical", label: "古典留白", note: "古典、巴洛克、歌剧", accent: "#816b56" },
  { id: "energy", label: "需要能量", note: "摇滚、独立、另类", accent: "#b53a38" },
  { id: "world", label: "去远方", note: "世界、民谣、拉丁", accent: "#35718a" },
];

const STORAGE_KEY = "qiaomu-radio-profile-v1";
const THEME_KEY = "qiaomu-radio-theme-v2";
const MAX_AUTOPLAY_ATTEMPTS = 5;

function loadProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_PROFILE,
      ...parsed,
      stationReliability: parsed.stationReliability || {},
      preferredCountryCode: /^[A-Z]{2}$/.test(parsed.preferredCountryCode || "") ? parsed.preferredCountryCode : null,
    };
  } catch { return EMPTY_PROFILE; }
}

function loadTheme(): ThemeId {
  const fromUrl = new URLSearchParams(window.location.search).get("theme") as ThemeId | null;
  const persisted = localStorage.getItem(THEME_KEY) as ThemeId | null;
  return getTheme(fromUrl || persisted || "rams").id;
}

function loadInitialSource(themeSource: StationSource, preferredCountryCode: string | null): StationSource {
  if (preferredCountryCode) return "regional";
  const explicitTheme = new URLSearchParams(window.location.search).has("theme");
  return explicitTheme || localStorage.getItem(THEME_KEY) ? themeSource : "regional";
}

function isHlsUrl(url: string) { return /\.m3u8(?:$|\?)/i.test(url); }

export function App() {
  const { t } = useI18n();
  const moods = useMemo(() => MOODS.map((item) => ({ ...item, label: t(`mood.${item.id}` as MessageKey) })), [t]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playbackRunRef = useRef(0);
  const catalogRunRef = useRef(0);
  const cancelPlaybackRef = useRef<(() => void) | null>(null);
  const confirmPlaybackRef = useRef<(() => void) | null>(null);
  const recoverRef = useRef<() => void>(() => {});
  const startingRef = useRef(false);
  const failoverRef = useRef<{ candidates: Station[]; index: number } | null>(null);
  const resolvedUrlsRef = useRef(new Map<string, { at: number; url: string }>());
  const [themeId, setThemeId] = useState<ThemeId>(loadTheme);
  const initialTheme = getTheme(themeId);
  const [profile, setProfile] = useState<TasteProfile>(loadProfile);
  const initialSource = useRef(loadInitialSource(initialTheme.source, profile.preferredCountryCode));
  const [mood, setMood] = useState<MoodId>(initialTheme.mood);
  const [source, setSource] = useState<StationSource>(initialSource.current);
  const [stations, setStations] = useState<Station[]>([]);
  const [current, setCurrent] = useState<Station | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [volume, setVolume] = useState(0.72);
  const [query, setQuery] = useState("");
  const [failedIds, setFailedIds] = useState<string[]>([]);

  const queue = useMemo(() => rankStations(stations, profile).filter((station) => station.id !== current?.id && !failedIds.includes(station.id)), [stations, profile, current?.id, failedIds]);
  const liked = Boolean(current && profile.likedStationIds.includes(current.id));

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }, [profile]);
  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeId);
    const url = new URL(window.location.href);
    url.searchParams.set("theme", themeId);
    window.history.replaceState({}, "", url);
  }, [themeId]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => () => { playbackRunRef.current += 1; hlsRef.current?.destroy(); }, []);

  const stopCurrentStream = useCallback(() => {
    cancelPlaybackRef.current?.();
    cancelPlaybackRef.current = null;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
  }, []);

  const resolveStation = useCallback(async (station: Station) => {
    const cached = resolvedUrlsRef.current.get(station.id);
    if (cached && Date.now() - cached.at < STREAM_URL_CACHE_MS) return cached.url;
    const response = await fetch(`/api/play/${encodeURIComponent(station.id)}`);
    const data = await response.json();
    if (!response.ok || !data.url) throw new Error(data.error || "直播流暂时不可用。");
    resolvedUrlsRef.current.set(station.id, { at: Date.now(), url: data.url });
    return String(data.url);
  }, []);

  const attachAndPlay = useCallback(async (url: string) => {
    const audio = audioRef.current;
    if (!audio) throw new Error("播放器尚未就绪。");
    hlsRef.current?.destroy();
    hlsRef.current = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    audio.volume = volume;
    const HlsRuntime = isHlsUrl(url) && !audio.canPlayType("application/vnd.apple.mpegurl")
      ? await loadHlsRuntime()
      : null;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let confirmPlayback!: () => void;
      const finish = (reason?: Error) => {
        if (settled) return;
        settled = true;
        if (confirmPlaybackRef.current === confirmPlayback) confirmPlaybackRef.current = null;
        window.clearTimeout(timeout);
        audio.removeEventListener("playing", onPlaying);
        audio.removeEventListener("canplay", onPlayable);
        audio.removeEventListener("timeupdate", onPlayable);
        audio.removeEventListener("error", onAudioError);
        if (reason) reject(reason); else resolve();
      };
      const onPlaying = () => finish();
      const onPlayable = () => { if (!audio.paused && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) finish(); };
      const onAudioError = () => finish(new Error("直播流无法解码或已经离线。"));
      confirmPlayback = () => finish();
      confirmPlaybackRef.current = confirmPlayback;
      const play = () => audio.play().then(
        () => finish(),
        (reason) => finish(reason instanceof Error ? reason : new Error("浏览器阻止了自动播放。")),
      );
      const timeout = window.setTimeout(() => finish(new Error("连接直播超过 15 秒。")), 15_000);
      cancelPlaybackRef.current = () => finish(new DOMException("Playback cancelled", "AbortError"));
      audio.addEventListener("playing", onPlaying, { once: true });
      audio.addEventListener("canplay", onPlayable);
      audio.addEventListener("timeupdate", onPlayable);
      audio.addEventListener("error", onAudioError, { once: true });

      if (HlsRuntime?.isSupported()) {
        let recoveryAttempts = 0;
        const hls = new HlsRuntime(HLS_RADIO_CONFIG);
        hlsRef.current = hls;
        hls.on(HlsRuntime.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (!settled || startingRef.current) { finish(new Error("HLS 直播源连接失败。")); return; }
          if (recoveryAttempts < 2 && data.type === HlsRuntime.ErrorTypes.NETWORK_ERROR) { recoveryAttempts += 1; hls.startLoad(); return; }
          if (recoveryAttempts < 2 && data.type === HlsRuntime.ErrorTypes.MEDIA_ERROR) { recoveryAttempts += 1; hls.recoverMediaError(); return; }
          recoverRef.current();
        });
        hls.on(HlsRuntime.Events.MANIFEST_PARSED, play);
        hls.loadSource(url);
        hls.attachMedia(audio);
      } else {
        audio.src = url;
        void play();
      }
    });
  }, [volume]);

  const startSequence = useCallback(async (candidates: Station[], startIndex = 0) => {
    const runId = ++playbackRunRef.current;
    stopCurrentStream();
    const limit = Math.min(candidates.length, startIndex + MAX_AUTOPLAY_ATTEMPTS);
    if (!candidates.length || startIndex >= candidates.length) { setError("这个系列暂时没有可播放的电台，换一种风格试试。"); return; }
    failoverRef.current = { candidates, index: startIndex };
    setError(""); setIsBuffering(true); setIsPlaying(false); startingRef.current = true;

    for (let index = startIndex; index < limit; index += 1) {
      if (playbackRunRef.current !== runId) return;
      const station = candidates[index];
      failoverRef.current = { candidates, index };
      setCurrent(station);
      if (index > startIndex) setNotice(`${candidates[index - 1].name} 无法播放，正在自动尝试下一家。`);
      try {
        const url = await resolveStation(station);
        if (playbackRunRef.current !== runId) return;
        await attachAndPlay(url);
        if (playbackRunRef.current !== runId) return;
        setIsPlaying(true); setIsBuffering(false); setError("");
        setProfile((previous) => {
          const reliable = recordStationOutcome(previous, station.id, "success");
          return { ...reliable, history: [{ station, listenedAt: new Date().toISOString() }, ...reliable.history.filter((entry) => entry.station.id !== station.id)].slice(0, 24) };
        });
        startingRef.current = false;
        return;
      } catch (reason) {
        if (playbackRunRef.current !== runId) return;
        const blocked = reason instanceof DOMException && reason.name === "NotAllowedError";
        if (blocked) { setIsBuffering(false); setError("风格已经切换。浏览器需要你再点一次播放才能发声。"); startingRef.current = false; return; }
        setProfile((previous) => recordStationOutcome(previous, station.id, "failure"));
        setFailedIds((previous) => Array.from(new Set([...previous, station.id])));
      }
    }
    if (playbackRunRef.current === runId) {
      stopCurrentStream(); setIsBuffering(false); setIsPlaying(false);
      setError(`这个系列暂时没有可播放的电台，已自动尝试 ${limit - startIndex} 家。`);
      startingRef.current = false;
    }
  }, [attachAndPlay, resolveStation, stopCurrentStream]);

  const fetchStations = useCallback(async (nextMood: MoodId, nextQuery = "", nextSource: StationSource = "radio-browser", autoplay = false, countryCode: string | null = nextSource === "regional" ? profile.preferredCountryCode : null) => {
    const catalogRun = ++catalogRunRef.current;
    setIsLoading(true); setError(""); setStations([]);
    try {
      const params = new URLSearchParams({ mood: nextMood, source: nextSource });
      if (nextQuery) params.set("q", nextQuery);
      if (countryCode) params.set("country", countryCode);
      const response = await fetch(`/api/stations?${params}`);
      const data = await response.json();
      if (catalogRun !== catalogRunRef.current) return [];
      if (!response.ok) throw new Error(data.error || "无法获取电台。");
      const nextStations = data.stations as Station[];
      if (data.warning) setNotice(String(data.warning));
      setStations(nextStations); setFailedIds([]);
      setIsLoading(false);
      if (!nextStations.length) setError("没有找到合适的直播电台，试试更宽泛的关键词。");
      else if (autoplay) await startSequence(rankStations(nextStations, profile));
      return nextStations;
    } catch (reason) {
      if (catalogRun !== catalogRunRef.current) return [];
      setError(reason instanceof Error ? reason.message : "电台目录暂时不可用。");
      return [];
    } finally { if (catalogRun === catalogRunRef.current) setIsLoading(false); }
  }, [profile, startSequence]);

  useEffect(() => {
    void fetchStations(initialTheme.mood, "", initialSource.current, false);
    // Initial data loads quietly; a deliberate theme click is the autoplay action.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- This initial load must not repeat when callback dependencies change.
  }, []);

  useEffect(() => {
    const candidates = [current, ...queue].filter((station): station is Station => Boolean(station)).slice(0, PREFETCH_STATION_COUNT);
    for (const station of candidates) {
      // Curated HLS must resolve through the same-origin segment prefetch relay.
      if (station.streamUrl && !isHlsUrl(station.streamUrl)) resolvedUrlsRef.current.set(station.id, { at: Date.now(), url: station.streamUrl });
    }
  }, [current, queue]);

  const playNext = useCallback(() => {
    const candidates = [...queue, ...stations.filter((station) => station.id !== current?.id && !queue.some((queued) => queued.id === station.id))];
    if (candidates.length) void startSequence(candidates); else setError("这一频道暂时没有更多可播电台，换个心情试试。");
  }, [queue, stations, current?.id, startSequence]);

  const playPrevious = useCallback(() => {
    const previous = profile.history.find((entry) => entry.station.id !== current?.id);
    if (previous) void startSequence([previous.station, ...queue]);
  }, [current?.id, profile.history, queue, startSequence]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (startingRef.current) {
      playbackRunRef.current += 1;
      stopCurrentStream();
      startingRef.current = false;
      setIsBuffering(false);
      setIsPlaying(false);
      return;
    }
    if (!current) { playNext(); return; }
    try {
      if (isPlaying) audio.pause();
      else if (audio.currentSrc || audio.src) await audio.play();
      else await startSequence([current, ...queue]);
    } catch { setError("浏览器暂时阻止了播放，请再点一次播放。"); }
  }, [current, isPlaying, playNext, queue, startSequence, stopCurrentStream]);

  const feedback = useCallback((value: "like" | "dislike") => {
    if (!current) return;
    setProfile((previous) => applyFeedback(previous, current, value));
    if (value === "like") setNotice("已记住这种声音。");
    else { setNotice("已减少这类电台，正在换一家。"); window.setTimeout(playNext, 120); }
  }, [current, playNext]);

  const submitSearch = (nextQuery: string) => {
    setQuery(nextQuery);
    void fetchStations(mood, nextQuery, source, true);
  };

  const chooseMood = (nextMood: MoodId) => {
    playbackRunRef.current += 1; stopCurrentStream();
    setMood(nextMood); setSource("radio-browser"); setQuery(""); setCurrent(null); setIsPlaying(false);
    void fetchStations(nextMood, "", "radio-browser", true);
  };

  const chooseGlobal = () => {
    playbackRunRef.current += 1; stopCurrentStream();
    setSource("global-curated"); setQuery(""); setCurrent(null); setIsPlaying(false);
    void fetchStations(mood, "", "global-curated", true);
  };

  const chooseRegion = (countryCode: string | null) => {
    playbackRunRef.current += 1; stopCurrentStream();
    setProfile((previous) => ({ ...previous, preferredCountryCode: countryCode }));
    setSource("regional"); setQuery(""); setCurrent(null); setIsPlaying(false);
    void fetchStations(mood, "", "regional", true, countryCode);
  };

  const chooseTheme = (nextThemeId: ThemeId) => {
    const nextTheme = getTheme(nextThemeId);
    playbackRunRef.current += 1; stopCurrentStream();
    setThemeId(nextTheme.id); setMood(nextTheme.mood); setSource(nextTheme.source); setQuery(""); setCurrent(null); setIsPlaying(false);
    setNotice(`已切换到「${nextTheme.label}」，正在寻找这个系列的电台。`);
    void fetchStations(nextTheme.mood, "", nextTheme.source, true);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, button, a, select, textarea")) return;
      if (event.code === "Space") { event.preventDefault(); void togglePlayback(); }
      if (event.key.toLowerCase() === "n") playNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playNext, togglePlayback]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    navigator.mediaSession.metadata = current && typeof MediaMetadata !== "undefined" ? new MediaMetadata({
      title: current.name,
      artist: current.country || "Qiaomu Radio",
      album: "Qiaomu Radio",
      artwork: current.favicon.startsWith("https://") ? [{ src: current.favicon }] : undefined,
    }) : null;
    const actions: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ["play", () => { void togglePlayback(); }],
      ["pause", () => { void togglePlayback(); }],
      ["previoustrack", playPrevious],
      ["nexttrack", playNext],
    ];
    for (const [action, handler] of actions) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* unsupported action */ }
    }
    return () => {
      for (const [action] of actions) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch { /* unsupported action */ }
      }
    };
  }, [current, isPlaying, playNext, playPrevious, togglePlayback]);

  const retryCurrentSeries = () => void fetchStations(mood, query, source, true);

  const recoverPlayback = useCallback(() => {
    if (startingRef.current || !current) return;
    setProfile((previous) => recordStationOutcome(previous, current.id, "failure"));
    setFailedIds((previous) => Array.from(new Set([...previous, current.id])));
    setIsPlaying(false);
    const failover = failoverRef.current;
    if (failover && failover.index + 1 < failover.candidates.length) {
      setNotice(`${current.name} 的直播中断了，正在自动切到下一家。`);
      void startSequence(failover.candidates, failover.index + 1);
    } else {
      stopCurrentStream();
      setIsBuffering(false);
      setError(`${current.name} 的直播流中断了，请重新寻找电台。`);
    }
  }, [current, startSequence, stopCurrentStream]);
  recoverRef.current = recoverPlayback;
  useEffect(() => {
    if (!isBuffering || startingRef.current) return;
    const timer = window.setTimeout(recoverPlayback, 15_000);
    return () => window.clearTimeout(timer);
  }, [isBuffering, recoverPlayback]);

  return (
    <main className={`listening-room room-${themeId}`}>
      <ThemePicker value={themeId} onChange={chooseTheme} />
      <div className="device-stage">
        <PlayerSkin
          key={themeId}
          theme={themeId}
          station={current}
          stations={queue}
          profile={profile}
          moods={moods}
          mood={mood}
          source={source}
          isPlaying={isPlaying}
          isLoading={isLoading || isBuffering}
          error={error}
          notice={notice}
          volume={volume}
          liked={liked}
          onToggle={() => void togglePlayback()}
          onNext={playNext}
          onPrevious={playPrevious}
          onLike={() => feedback("like")}
          onDislike={() => feedback("dislike")}
          onPlay={(station) => void startSequence([station, ...queue.filter((item) => item.id !== station.id)])}
          onMood={chooseMood}
          onSearch={submitSearch}
          onChina={() => {
            setSource("china-curated"); setQuery("");
            void fetchStations(mood, "", "china-curated", true);
          }}
          onGlobal={chooseGlobal}
          onRegion={chooseRegion}
          preferredCountryCode={profile.preferredCountryCode}
          onVolume={(value) => {
            setVolume(value);
            if (audioRef.current) audioRef.current.volume = value;
          }}
          onRetry={retryCurrentSeries}
        />
      </div>
      <audio ref={audioRef} preload="auto" playsInline onPlaying={() => { confirmPlaybackRef.current?.(); setIsPlaying(true); setIsBuffering(false); }} onCanPlay={() => setIsBuffering(false)} onTimeUpdate={() => { const audio = audioRef.current; if (audio && !audio.paused && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) { confirmPlaybackRef.current?.(); setIsBuffering(false); } }} onWaiting={() => { if (!startingRef.current) setIsBuffering(true); }} onStalled={() => { if (!startingRef.current) setIsBuffering(true); }} onPause={() => setIsPlaying(false)} onError={recoverPlayback} />
    </main>
  );
}

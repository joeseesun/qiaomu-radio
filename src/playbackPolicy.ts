import type { HlsConfig } from "hls.js";

// Live radio should trade a little latency for continuity. This is not an
// offline cache: hls.js keeps a rolling in-memory buffer and discards old audio.
export const HLS_RADIO_CONFIG: Partial<HlsConfig> = {
  enableWorker: true,
  lowLatencyMode: false,
  startFragPrefetch: true,
  liveSyncDuration: 8,
  liveMaxLatencyDuration: 30,
  maxLiveSyncPlaybackRate: 1,
  maxBufferLength: 45,
  maxMaxBufferLength: 90,
  backBufferLength: 15,
  maxBufferHole: 0.8,
  highBufferWatchdogPeriod: 3,
  nudgeMaxRetry: 5,
  manifestLoadingMaxRetry: 4,
  levelLoadingMaxRetry: 6,
  fragLoadingMaxRetry: 8,
};

export const PREFETCH_STATION_COUNT = 3;
export const STREAM_URL_CACHE_MS = 10 * 60 * 1000;

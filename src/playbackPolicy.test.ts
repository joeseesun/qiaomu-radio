import { describe, expect, it } from "vitest";
import { HLS_RADIO_CONFIG, PREFETCH_STATION_COUNT } from "./playbackPolicy";

describe("live radio buffering policy", () => {
  it("buffers well behind the live edge instead of optimizing for latency", () => {
    expect(HLS_RADIO_CONFIG.lowLatencyMode).toBe(false);
    expect(HLS_RADIO_CONFIG.liveSyncDuration).toBeGreaterThanOrEqual(8);
    expect(HLS_RADIO_CONFIG.maxBufferLength).toBeGreaterThanOrEqual(30);
    expect(HLS_RADIO_CONFIG.fragLoadingMaxRetry).toBeGreaterThanOrEqual(6);
  });
  it("pre-resolves only a small number of next stations", () => {
    expect(PREFETCH_STATION_COUNT).toBeGreaterThan(0);
    expect(PREFETCH_STATION_COUNT).toBeLessThanOrEqual(3);
  });
});

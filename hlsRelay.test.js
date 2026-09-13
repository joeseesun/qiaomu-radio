import { describe, expect, it } from "vitest";
import { isHlsStream, mergeHlsPlaylist, rewriteHlsPlaylist } from "./hlsRelay.mjs";

describe("reviewed HLS relay", () => {
  it("rewrites relative segments without exposing their upstream URLs", () => {
    const resources = new Map();
    const body = rewriteHlsPlaylist("#EXTM3U\n#EXTINF:2,\naudio/1.ts\n", "https://radio.example/live/index.m3u8", "station-1", (key, url) => resources.set(key, url));
    expect(body).toMatch(/\/api\/hls\/station-1\/[a-f0-9]{24}\.ts/);
    expect(body).not.toContain("radio.example");
    expect([...resources.values()]).toEqual(["https://radio.example/live/audio/1.ts"]);
  });
  it("recognizes HLS URLs with query strings", () => expect(isHlsStream("https://radio.example/live.m3u8?v=1")).toBe(true));
  it("retains older live segments to create a deeper rolling window", () => {
    const resources = new Map(), history = new Map();
    mergeHlsPlaylist("#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:10\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\n10.ts", "https://radio.example/live.m3u8", "station-1", (key,url)=>resources.set(key,url), history);
    const merged = mergeHlsPlaylist("#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:11\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\n11.ts", "https://radio.example/live.m3u8", "station-1", (key,url)=>resources.set(key,url), history);
    expect(merged.body).toContain("#EXT-X-MEDIA-SEQUENCE:10");
    expect(merged.body.match(/\.ts/g)).toHaveLength(2);
  });
});

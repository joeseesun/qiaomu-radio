import { describe, expect, it } from "vitest";
import { somaChannel } from "./useNowPlaying";
import type { Station } from "./types";

const station = (streamUrl: string) => ({ streamUrl } as Station);
describe("SomaFM metadata routing", () => {
  it("extracts the same channel across bitrate variants", () => {
    expect(somaChannel(station("https://ice2.somafm.com/groovesalad-128-mp3"))).toBe("groovesalad");
    expect(somaChannel(station("https://ice1.somafm.com/dronezone-64-aac"))).toBe("dronezone");
  });
  it("does not trust lookalike domains or unrelated radio sources", () => {
    expect(somaChannel(station("https://somafm.com.example.org/groovesalad-128-mp3"))).toBeNull();
    expect(somaChannel(station("https://fake-somafm.com/groovesalad-128-mp3"))).toBeNull();
    expect(somaChannel(station("https://ngcdn001.cnr.cn/live/zgzs/index.m3u8"))).toBeNull();
  });
  it("handles missing and malformed streams", () => {
    expect(somaChannel(null)).toBeNull();
    expect(somaChannel(station("not a URL"))).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { GLOBAL_CURATED_STATIONS, clientIp, countryCode, selectPopularMusic } from "./serverPolicy.mjs";

describe("regional startup policy", () => {
  it("ships exactly 20 HTTPS music fallbacks", () => {
    expect(GLOBAL_CURATED_STATIONS).toHaveLength(20);
    expect(GLOBAL_CURATED_STATIONS.every((item) => item.streamUrl.startsWith("https://"))).toBe(true);
  });
  it("filters talk stations and diversifies the first pass", () => {
    const raw = [
      { url: "https://a", tags: "music", countrycode: "US", lastcheckok: 1 },
      { url: "https://b", tags: "rock", countrycode: "US", lastcheckok: 1 },
      { url: "https://c", tags: "pop", countrycode: "US", lastcheckok: 1 },
      { url: "https://d", tags: "jazz", countrycode: "FR", lastcheckok: 1 },
      { url: "https://e", tags: "news talk music", countrycode: "GB", lastcheckok: 1 },
    ];
    expect(selectPopularMusic(raw, 3).map((item) => item.url)).toEqual(["https://a", "https://b", "https://d"]);
  });
  it("accepts public forwarded IPs without trusting invalid country codes", () => {
    expect(clientIp({ headers: { "x-forwarded-for": "8.8.8.8, 10.0.0.2" }, socket: {} })).toBe("8.8.8.8");
    expect(clientIp({ headers: {}, socket: { remoteAddress: "127.0.0.1" } })).toBeNull();
    expect(countryCode("de")).toBe("DE");
    expect(countryCode("XX")).toBeNull();
  });
});

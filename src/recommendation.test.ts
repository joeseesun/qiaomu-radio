import { describe, expect, it, vi } from "vitest";
import { applyFeedback, EMPTY_PROFILE, rankStations, stationScore } from "./recommendation";
import type { Station } from "./types";

const station = (id: string, tags: string[], streamUrl = "https://example.com/radio.mp3"): Station => ({
  id,
  name: id,
  tags,
  streamUrl,
  homepage: "",
  favicon: "",
  country: "",
  countryCode: "",
  language: "",
  codec: "MP3",
  bitrate: 128,
  votes: 1,
  clickCount: 1,
});

describe("taste recommendation", () => {
  it("raises weights for liked tags", () => {
    const next = applyFeedback(EMPTY_PROFILE, station("jazz", ["jazz", "soul"]), "like");
    expect(next.tagWeights.jazz).toBe(1);
    expect(next.likedStationIds).toContain("jazz");
  });

  it("removes disliked stations from the queue", () => {
    const disliked = applyFeedback(EMPTY_PROFILE, station("noise", ["noise"]), "dislike");
    expect(rankStations([station("noise", ["noise"]), station("calm", ["ambient"])], disliked)[0].id).toBe("calm");
  });

  it("prefers https streams when other signals are equal", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(stationScore(station("secure", [], "https://example.com/a"), EMPTY_PROFILE)).toBeGreaterThan(
      stationScore(station("plain", [], "http://example.com/a"), EMPTY_PROFILE),
    );
    vi.restoreAllMocks();
  });
});

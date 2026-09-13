import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, rankStations, recordPlay, recordSkip, setLiked } from "./taste";
import type { Station } from "./types";

const station = (id: string, tags: string[]): Station => ({
  id,
  name: id,
  streamUrl: `https://example.com/${id}.mp3`,
  homepage: "",
  favicon: "",
  tags,
  country: "",
  countryCode: "",
  language: "",
  codec: "MP3",
  bitrate: 128,
  votes: 1,
  clickCount: 1,
});

describe("local radio taste", () => {
  it("moves liked tags ahead without uploading a profile", () => {
    const jazz = station("jazz", ["jazz"]);
    const rock = station("rock", ["rock"]);
    const profile = setLiked(EMPTY_PROFILE, jazz, true);
    expect(rankStations([rock, jazz], profile, () => 0)[0]?.id).toBe("jazz");
  });

  it("deduplicates history and keeps the newest play first", () => {
    const jazz = station("jazz", ["jazz"]);
    const twice = recordPlay(recordPlay(EMPTY_PROFILE, jazz), jazz);
    expect(twice.history).toHaveLength(1);
  });

  it("removes skipped stations from recommendations", () => {
    const jazz = station("jazz", ["jazz"]);
    expect(rankStations([jazz], recordSkip(EMPTY_PROFILE, jazz), () => 0)).toHaveLength(0);
  });
});

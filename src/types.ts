export type MoodId = "unwind" | "focus" | "jazz" | "classical" | "energy" | "world";

export type ThemeId = "editorial" | "pocket" | "deck" | "console" | "rams" | "fantasy";
export type StationSource = "radio-browser" | "china-curated" | "regional" | "global-curated";

export type Station = {
  id: string;
  name: string;
  streamUrl: string;
  homepage: string;
  favicon: string;
  tags: string[];
  country: string;
  countryCode: string;
  language: string;
  codec: string;
  bitrate: number;
  votes: number;
  clickCount: number;
  source?: StationSource;
};

export type TasteProfile = {
  likedStationIds: string[];
  dislikedStationIds: string[];
  tagWeights: Record<string, number>;
  history: Array<{ station: Station; listenedAt: string }>;
};

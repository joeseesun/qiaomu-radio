export type MoodId = "recommend" | "focus" | "unwind" | "jazz" | "classical" | "energy" | "world";

export interface Station {
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
}

export interface HistoryEntry {
  station: Station;
  listenedAt: string;
}

export interface TasteProfile {
  likedStationIds: string[];
  skippedStationIds: string[];
  tagWeights: Record<string, number>;
  history: HistoryEntry[];
}

export interface RadioSettings {
  language?: import("./i18n").LanguageSetting;
  defaultMood: MoodId;
  volume: number;
  theme: import("./themes").RadioThemeId;
}

export interface RadioData {
  settings: RadioSettings;
  profile: TasteProfile;
}

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface PlayerState {
  station: Station | null;
  status: PlayerStatus;
  message: string;
  volume: number;
}

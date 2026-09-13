import type { Station, TasteProfile } from "./types";

export const EMPTY_PROFILE: TasteProfile = {
  likedStationIds: [],
  dislikedStationIds: [],
  tagWeights: {},
  history: [],
};

export function stationScore(station: Station, profile: TasteProfile, random = Math.random()) {
  const affinity = station.tags.reduce((sum, tag) => sum + (profile.tagWeights[tag] || 0), 0);
  const quality = Math.log10(Math.max(1, station.clickCount)) * 0.12 + Math.log10(Math.max(1, station.votes)) * 0.08;
  const httpsBonus = station.streamUrl.startsWith("https://") ? 0.7 : 0;
  return affinity + quality + httpsBonus + random * 1.8;
}

export function rankStations(stations: Station[], profile: TasteProfile) {
  const rejected = new Set(profile.dislikedStationIds);
  const recent = new Set(profile.history.slice(0, 8).map((entry) => entry.station.id));
  return stations
    .filter((station) => !rejected.has(station.id))
    .map((station) => ({
      station,
      score: stationScore(station, profile) - (recent.has(station.id) ? 5 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ station }) => station);
}

export function applyFeedback(profile: TasteProfile, station: Station, value: "like" | "dislike") {
  const delta = value === "like" ? 1 : -1.5;
  const tagWeights = { ...profile.tagWeights };
  station.tags.slice(0, 6).forEach((tag) => {
    tagWeights[tag] = Math.max(-6, Math.min(8, (tagWeights[tag] || 0) + delta));
  });
  return {
    ...profile,
    likedStationIds:
      value === "like"
        ? Array.from(new Set([...profile.likedStationIds, station.id]))
        : profile.likedStationIds.filter((id) => id !== station.id),
    dislikedStationIds:
      value === "dislike"
        ? Array.from(new Set([...profile.dislikedStationIds, station.id]))
        : profile.dislikedStationIds.filter((id) => id !== station.id),
    tagWeights,
  };
}

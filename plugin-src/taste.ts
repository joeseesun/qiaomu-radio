import type { Station, TasteProfile } from "./types";

export const EMPTY_PROFILE: TasteProfile = {
  likedStationIds: [],
  skippedStationIds: [],
  tagWeights: {},
  history: [],
};

export function rankStations(stations: Station[], profile: TasteProfile, random = Math.random): Station[] {
  const skipped = new Set(profile.skippedStationIds);
  const recent = new Set(profile.history.slice(0, 8).map((entry) => entry.station.id));
  return stations
    .filter((station) => !skipped.has(station.id))
    .map((station) => {
      const affinity = station.tags.reduce((sum, tag) => sum + (profile.tagWeights[tag] ?? 0), 0);
      const popularity = Math.log10(Math.max(1, station.clickCount)) * 0.12 + Math.log10(Math.max(1, station.votes)) * 0.08;
      const recentPenalty = recent.has(station.id) ? 4 : 0;
      return { station, score: affinity + popularity + random() * 1.6 - recentPenalty };
    })
    .sort((left, right) => right.score - left.score)
    .map(({ station }) => station);
}

export function recordPlay(profile: TasteProfile, station: Station): TasteProfile {
  const history = [{ station, listenedAt: new Date().toISOString() }, ...profile.history.filter((entry) => entry.station.id !== station.id)].slice(0, 80);
  return { ...profile, history };
}

export function setLiked(profile: TasteProfile, station: Station, liked: boolean): TasteProfile {
  const tagWeights = { ...profile.tagWeights };
  station.tags.slice(0, 6).forEach((tag) => {
    tagWeights[tag] = Math.max(-6, Math.min(8, (tagWeights[tag] ?? 0) + (liked ? 1 : -1)));
  });
  return {
    ...profile,
    likedStationIds: liked
      ? Array.from(new Set([...profile.likedStationIds, station.id]))
      : profile.likedStationIds.filter((id) => id !== station.id),
    tagWeights,
  };
}

export function recordSkip(profile: TasteProfile, station: Station): TasteProfile {
  const skippedStationIds = [station.id, ...profile.skippedStationIds.filter((id) => id !== station.id)].slice(0, 40);
  const tagWeights = { ...profile.tagWeights };
  station.tags.slice(0, 6).forEach((tag) => {
    tagWeights[tag] = Math.max(-6, (tagWeights[tag] ?? 0) - 0.5);
  });
  return { ...profile, skippedStationIds, tagWeights };
}

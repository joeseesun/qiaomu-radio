import type { Station, TasteProfile } from "./types";

export const EMPTY_PROFILE: TasteProfile = {
  likedStationIds: [],
  dislikedStationIds: [],
  tagWeights: {},
  history: [],
  stationReliability: {},
  preferredCountryCode: null,
};

function reliabilityScore(profile: TasteProfile, stationId: string, now: number) {
  const reliability = profile.stationReliability[stationId];
  if (!reliability) return 0;
  const successBonus = Math.min(1.2, Math.log2(1 + reliability.successes) * .3);
  const failureAge = reliability.lastFailureAt ? now - Date.parse(reliability.lastFailureAt) : Number.POSITIVE_INFINITY;
  const decay = failureAge < 6 * 60 * 60 * 1000 ? 1 : failureAge < 24 * 60 * 60 * 1000 ? .35 : 0;
  return successBonus - Math.min(8, reliability.consecutiveFailures * 2.25) * decay;
}

export function stationScore(station: Station, profile: TasteProfile, random = Math.random(), now = Date.now()) {
  const affinity = station.tags.reduce((sum, tag) => sum + (profile.tagWeights[tag] || 0), 0);
  const quality = Math.log10(Math.max(1, station.clickCount)) * 0.12 + Math.log10(Math.max(1, station.votes)) * 0.08;
  const httpsBonus = station.streamUrl.startsWith("https://") ? 0.7 : 0;
  return affinity + quality + httpsBonus + reliabilityScore(profile, station.id, now) + random * 1.8;
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

export function recordStationOutcome(profile: TasteProfile, stationId: string, outcome: "success" | "failure", now = new Date()) {
  const previous = profile.stationReliability[stationId] || { successes: 0, failures: 0, consecutiveFailures: 0 };
  const next = outcome === "success"
    ? { ...previous, successes: previous.successes + 1, consecutiveFailures: 0, lastSuccessAt: now.toISOString() }
    : { ...previous, failures: previous.failures + 1, consecutiveFailures: previous.consecutiveFailures + 1, lastFailureAt: now.toISOString() };
  const entries = Object.entries({ ...profile.stationReliability, [stationId]: next })
    .sort(([, left], [, right]) => Date.parse(right.lastFailureAt || right.lastSuccessAt || "") - Date.parse(left.lastFailureAt || left.lastSuccessAt || ""))
    .slice(0, 120);
  return { ...profile, stationReliability: Object.fromEntries(entries) };
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

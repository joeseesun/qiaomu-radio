import { createHash } from "node:crypto";

export function rewriteHlsPlaylist(text, sourceUrl, stationId, remember) {
  const base = new URL(sourceUrl);
  return text.split(/\r?\n/).map((line) => {
    const value = line.trim();
    if (!value || value.startsWith("#")) return line;
    const absolute = new URL(value, base).href;
    const token = createHash("sha256").update(absolute).digest("hex").slice(0, 24);
    remember(token, absolute);
    const extension = new URL(absolute).pathname.match(/\.(ts|aac|m4s|mp4)$/i)?.[0] || ".ts";
    const suffix = /\.m3u8(?:$|\?)/i.test(absolute) ? ".m3u8" : extension;
    return `/api/hls/${encodeURIComponent(stationId)}/${token}${suffix}`;
  }).join("\n");
}

export function mergeHlsPlaylist(text, sourceUrl, stationId, remember, history = new Map(), keep = 36) {
  const lines = text.split(/\r?\n/), sequence = Number(lines.find((line) => line.startsWith("#EXT-X-MEDIA-SEQUENCE:"))?.split(":")[1] || 0);
  const target = lines.find((line) => line.startsWith("#EXT-X-TARGETDURATION:")) || "#EXT-X-TARGETDURATION:2";
  let index = 0, block = [];
  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) { block = [line]; continue; }
    if (!block.length) continue;
    if (line.startsWith("#")) { block.push(line); continue; }
    const rewritten = rewriteHlsPlaylist(line, sourceUrl, stationId, remember);
    history.set(sequence + index, [...block, rewritten]); index += 1; block = [];
  }
  const entries = [...history.entries()].sort((a,b) => a[0]-b[0]).slice(-keep);
  history.clear(); for (const entry of entries) history.set(...entry);
  const first = entries[0]?.[0] ?? sequence;
  return { history, body: ["#EXTM3U", "#EXT-X-VERSION:3", `#EXT-X-MEDIA-SEQUENCE:${first}`, target, ...entries.flatMap(([,value]) => value), ""].join("\n") };
}

export function isHlsStream(url) { return /\.m3u8(?:$|\?)/i.test(url); }

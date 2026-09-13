import net from "node:net";

const station = (id, name, streamUrl, country, countryCode, language, tags, codec = "MP3", bitrate = 128) => ({
  id, name, streamUrl, homepage: "", favicon: "", tags, country, countryCode, language,
  codec, bitrate, votes: 100, clickCount: 100, source: "global-curated",
});

// A cold-start fallback: broadcaster/direct HTTPS streams checked at release time.
// Runtime Radio Browser rankings remain preferred because stream URLs do change.
export const GLOBAL_CURATED_STATIONS = [
  station("global-mangoradio", "MANGORADIO", "https://mangoradio.stream.laut.fm/mangoradio", "Germany", "DE", "Deutsch", ["music", "variety"]),
  station("global-dance-wave", "Dance Wave!", "https://dancewave.online/dance.mp3", "Hungary", "HU", "Magyar", ["dance", "electronic", "house"]),
  station("global-reyfm", "REYFM Original", "https://listen.reyfm.de/original_192kbps.mp3", "Germany", "DE", "Deutsch", ["pop", "electronic"], "MP3", 192),
  station("global-jazz-radio-blues", "Jazz Radio Blues", "https://jazzblues.ice.infomaniak.ch/jazzblues-high.mp3", "France", "FR", "Français", ["jazz", "blues"]),
  station("global-rmf-fm", "RMF FM", "https://rs6-krk2.rmfstream.pl/rmf_fm", "Poland", "PL", "Polski", ["pop", "hits"]),
  station("global-classic-fm", "Classic FM", "https://media-ice.musicradio.com/ClassicFMMP3", "United Kingdom", "GB", "English", ["classical"]),
  station("global-dance-wave-retro", "Dance Wave Retro!", "https://dancewave.online/retrodance.mp3", "Hungary", "HU", "Magyar", ["dance", "90s"]),
  station("global-ambient-sleeping-pill", "Ambient Sleeping Pill", "https://radio.stereoscenic.com/asp-h", "United States", "US", "English", ["ambient", "relax"]),
  station("global-frisky", "Frisky Radio", "https://stream2.friskyradio.com/frisky_mp3_hi", "United States", "US", "English", ["electronic", "progressive"]),
  station("global-fip", "FIP", "https://icecast.radiofrance.fr/fip-hifi.aac", "France", "FR", "Français", ["eclectic", "jazz", "world"], "AAC", 192),
  station("global-radio-paradise", "Radio Paradise Main Mix", "https://stream.radioparadise.com/aac-320", "United States", "US", "English", ["eclectic", "rock"], "AAC", 320),
  station("global-kexp", "KEXP 90.3 FM", "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", "United States", "US", "English", ["indie", "alternative"]),
  station("global-nts-1", "NTS Radio 1", "https://stream-relay-geo.ntslive.net/stream", "United Kingdom", "GB", "English", ["underground", "electronic"]),
  station("global-radio-swiss-jazz", "Radio Swiss Jazz", "https://stream.srg-ssr.ch/m/rsj/mp3_128", "Switzerland", "CH", "Deutsch", ["jazz", "soul"]),
  station("global-fluxfm", "FluxFM", "https://streams.fluxfm.de/live/mp3-320/streams.fluxfm.de/", "Germany", "DE", "Deutsch", ["indie", "alternative"], "MP3", 320),
  station("global-radio-paradise-mellow", "Radio Paradise Mellow Mix", "https://stream.radioparadise.com/mellow-320", "United States", "US", "English", ["mellow", "eclectic"], "AAC", 320),
  station("global-radio-paradise-rock", "Radio Paradise Rock Mix", "https://stream.radioparadise.com/rock-320", "United States", "US", "English", ["rock", "alternative"], "AAC", 320),
  station("global-wqxr", "WQXR", "https://stream.wqxr.org/wqxr", "United States", "US", "English", ["classical"]),
  station("global-nts-2", "NTS Radio 2", "https://stream-relay-geo.ntslive.net/stream2", "United Kingdom", "GB", "English", ["experimental", "electronic"]),
  station("global-bbc-6music", "BBC Radio 6 Music", "https://stream.live.vc.bbcmedia.co.uk/bbc_6music", "United Kingdom", "GB", "English", ["alternative", "indie"]),
];

const MUSIC = /music|jazz|rock|pop|classical|dance|electronic|ambient|indie|soul|blues|folk|latin|hits/i;
const NON_MUSIC = /news|talk|sport|religion|politic|weather|traffic/i;

export function selectPopularMusic(rawStations, limit = 20) {
  const eligible = rawStations.filter((item) => {
    const tags = String(item.tags || "");
    const url = item.url_resolved || item.url || item.streamUrl || "";
    return /^https:\/\//.test(url) && Number(item.lastcheckok ?? 1) === 1 && MUSIC.test(tags) && !NON_MUSIC.test(tags);
  });
  const result = [], deferred = [], countries = new Map();
  for (const item of eligible) {
    const country = String(item.countrycode || item.countryCode || "").toUpperCase();
    if ((countries.get(country) || 0) >= 2) deferred.push(item);
    else { result.push(item); countries.set(country, (countries.get(country) || 0) + 1); }
    if (result.length === limit) return result;
  }
  for (const item of deferred) { result.push(item); if (result.length === limit) break; }
  return result;
}

export function clientIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const raw = forwarded || request.socket?.remoteAddress || "";
  const value = raw.replace(/^::ffff:/, "");
  if (!net.isIP(value) || value === "::1" || value.startsWith("127.") || value.startsWith("10.") || value.startsWith("192.168.")) return null;
  return value;
}

export function countryCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

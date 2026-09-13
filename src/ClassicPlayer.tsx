import { useEffect, useState, type ReactNode } from "react";
import { Heart, Pause, Play, Search, SkipBack, SkipForward, Square, ThumbsDown, Volume2 } from "lucide-react";
import type { PlayerProps } from "./PlayerSkin";
import type { NowPlaying } from "./useNowPlaying";
import { regionName, useI18n } from "./i18n";

type Props = { player: PlayerProps; screen: ReactNode; page: string; open: (page: "now" | "menu" | "channels" | "regions" | "stations" | "favorites" | "history" | "search" | "info") => void; track: NowPlaying | null };
export function ClassicPlayer({ player: p, screen, page, open, track }: Props) {
  const { locale, t } = useI18n();
  const amp = p.theme === "deck";
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { setElapsed(0); }, [p.station?.id]);
  useEffect(() => {
    if (!p.isPlaying) return;
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [p.isPlaying]);
  const time = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const stations = [...(p.station ? [p.station] : []), ...p.stations.filter((s) => s.id !== p.station?.id)];
  const transport = <div className="classic-transport">
    <button aria-label={t("action.previous")} onClick={p.onPrevious}><SkipBack size={18} fill="currentColor" /></button>
    <button aria-label={p.isPlaying ? t("action.pause") : t("action.play")} onClick={p.onToggle}>{p.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
    <button aria-label={t("action.stop")} onClick={() => { if (p.isPlaying || p.isLoading) p.onToggle(); }}><Square size={17} /></button>
    <button aria-label={t("action.next")} onClick={p.onNext}><SkipForward size={18} fill="currentColor" /></button>
    <button aria-label={p.liked ? t("action.unlike") : t("action.like")} disabled={!p.station} onClick={p.onLike}><Heart size={17} fill={p.liked ? "currentColor" : "none"} /></button>
    <button aria-label={t("action.dislike")} disabled={!p.station} onClick={p.onDislike}><ThumbsDown size={16} /></button>
  </div>;
  const volume = <label className="classic-volume"><Volume2 size={15} /><input aria-label={t("action.volume")} type="range" min="0" max="1" step="0.01" value={p.volume} onChange={(e) => p.onVolume(Number(e.target.value))} /></label>;
  const spectrum = <div className={`classic-spectrum ${p.isPlaying ? "active" : ""}`} aria-hidden="true">{Array.from({ length: 24 }, (_, n) => <i key={n} style={{ "--level": `${15 + n * 17 % 70}%`, "--delay": `${n * -0.08}s` } as React.CSSProperties} />)}</div>;
  return <section className={amp ? "classic-amp" : "classic-foobar"} aria-label={amp ? "Winamp 播放器" : "foobar2000 播放器"}>
    <div className="classic-title"><span>{amp ? "ϟ" : "◈"}</span><strong>{amp ? "WINAMP" : `${p.station?.name || "Qiaomu Radio"} [foobar2000]`}</strong><button aria-label={t("action.about")} onClick={() => open("info")}>···</button></div>
    {amp ? <>
      <div className="amp-main">
        <div className="amp-led"><span className="amp-led-time">{p.isLoading ? "··:··" : time}</span>{spectrum}</div>
        <div className="amp-info"><div className="amp-track">{track ? `${track.artist} – ${track.title}` : p.station?.name || "QIAOMU RADIO"}</div><div className="amp-codec"><b>{p.station?.bitrate || "—"}</b> kbps <b>{p.station?.codec || "LIVE"}</b></div>{volume}<div className="amp-toggles"><button onClick={() => open("channels")}>{t("page.channels")}</button><button onClick={() => open(page === "now" ? "search" : "now")}>{t("page.search")}</button><button onClick={() => open(page === "history" ? "now" : "history")}>{t("page.history")}</button></div></div>
      </div>
      <div className="amp-transports">{transport}<button className="amp-library" onClick={() => open(page === "favorites" ? "now" : "favorites")}>{t("page.favorites")}</button></div>
      <div className="amp-section-label">WINAMP PLAYLIST</div>
    </> : <>
      <div className="foobar-menu"><button onClick={() => open("search")}>File</button><button onClick={() => open("favorites")}>Edit</button><button onClick={() => open("now")}>View</button><button onClick={p.onToggle}>Playback</button><button onClick={() => open("channels")}>Library</button><button onClick={() => open("info")}>Help</button></div>
      <div className="foobar-toolbar">{transport}<button className="classic-search-button" aria-label={t("page.search")} onClick={() => open("search")}><Search size={17} /></button>{volume}</div>
      <div className="foobar-tabs"><button aria-pressed={page === "now"} onClick={() => open("now")}>Default Playlist</button><button aria-pressed={page === "favorites"} onClick={() => open("favorites")}>{t("page.favorites")}</button><button aria-pressed={page === "history"} onClick={() => open("history")}>{t("page.history")}</button></div>
    </>}
    {page === "now" ? <div className="classic-playlist">
      <div className="playlist-columns"><span>#</span><span>{t("label.station")}</span><span>{t("label.region")}</span><span>{t("label.format")}</span></div>
      <div className="playlist-scroll">{stations.slice(0, 50).map((station, index) => <button key={station.id} className={p.station?.id === station.id ? "current-row" : ""} onClick={() => p.onPlay(station)}><span>{index === 0 && p.isPlaying ? "▶" : String(index + 1).padStart(2, "0")}</span><span>{station.name}</span><span>{regionName(locale,station.countryCode,station.country)}</span><span>{station.codec || "LIVE"}</span></button>)}{!stations.length && <button className="playlist-empty" onClick={() => open("channels")}>{p.isLoading ? t("empty.loading") : t("empty.stations")}</button>}</div>
    </div> : <div className="classic-panel">{screen}</div>}
    {page === "now" && (p.error || p.notice) && <div className="classic-notice" role={p.error ? "alert" : "status"}>{p.error || p.notice}{p.error && <button onClick={p.onRetry}>{t("action.retry")}</button>}</div>}
    <div className="classic-status"><span>{p.isLoading ? t("status.connecting") : p.isPlaying ? `${p.station?.codec || "LIVE"} · ${track ? track.title : t("status.broadcast")}` : t("status.stopped")}</span><span>{time} · {Math.round(p.volume * 100)}%</span></div>
  </section>;
}

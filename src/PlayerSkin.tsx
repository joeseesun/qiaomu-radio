import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClassicPlayer } from "./ClassicPlayer";
import { useNowPlaying } from "./useNowPlaying";
import { ChevronLeft, ChevronRight, Heart, History, ListMusic, Pause, Play, Search, SkipBack, SkipForward, ThumbsDown, Volume2, Radio, Info, LoaderCircle, ExternalLink, ZoomOut } from "lucide-react";
import type { MoodId, Station, StationSource, TasteProfile, ThemeId } from "./types";
import { SupportPanel } from "./SupportPanel";
import { ModelLoader } from "./ModelLoader";
import { LOCALES, LOCALE_LABELS, regionName, useI18n, type MessageKey } from "./i18n";
import { RADIO_REGIONS } from "./regions";
import { FantasyModelPreload } from "./modelAssets";

type Page = "now" | "menu" | "channels" | "regions" | "stations" | "favorites" | "history" | "search" | "info" | "support" | "language";
export type PlayerProps = {
  theme: ThemeId;
  station: Station | null;
  stations: Station[];
  profile: TasteProfile;
  moods: Array<{ id: MoodId; label: string }>;
  mood: MoodId;
  source: StationSource;
  isPlaying: boolean;
  isLoading: boolean;
  error: string;
  notice: string;
  volume: number;
  liked: boolean;
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onLike: () => void;
  onDislike: () => void;
  onPlay: (station: Station) => void;
  onMood: (mood: MoodId) => void;
  onSearch: (query: string) => void;
  onChina: () => void;
  onGlobal: () => void;
  onRegion: (countryCode: string | null) => void;
  preferredCountryCode: string | null;
  onVolume: (volume: number) => void;
  onRetry: () => void;
};

const NativeRadio = lazy(() => import("./NativeRadio"));
const FantasyRadio = lazy(() => import("./RamsRadio"));

export function PlayerSkin(props: PlayerProps) {
  const { locale, setLocale, t } = useI18n();
  const titles: Record<Page, string> = { now:t("page.now"),menu:t("page.menu"),channels:t("page.channels"),regions:t("page.regions"),stations:t("page.stations"),favorites:t("page.favorites"),history:t("page.history"),search:t("page.search"),info:t("page.info"),support:t("page.support"),language:t("page.language") };
  const { theme, station, isPlaying, isLoading, volume, liked } = props;
  const [page, setPage] = useState<Page>("now");
  const [selected, setSelected] = useState(0);
  const [search, setSearch] = useState("");
  const screenRef = useRef<HTMLDivElement>(null);
  const track = useNowPlaying(station);
  const pocket = theme === "pocket";
  const deck = theme === "deck";
  const consoleSkin = theme === "console";
  const label = pocket ? "iPod" : deck ? "Winamp" : consoleSkin ? "foobar2000" : t(`theme.${theme}` as MessageKey);
  const status = isLoading ? t("status.connecting") : isPlaying ? t("status.live") : t("status.paused");

  const selectedRegion = props.preferredCountryCode
    ? Math.max(0, RADIO_REGIONS.findIndex((code) => code === props.preferredCountryCode) + 1)
    : 0;
  const open = (next: Page) => { setPage(next); setSelected(next === "regions" ? selectedRegion : 0); };
  const back = () => open(page === "now" ? "menu" : page === "menu" ? "now" : "menu");
  const saved = [...new Map([...props.profile.history.map((entry) => entry.station), ...props.stations, ...(station ? [station] : [])].map((item) => [item.id, item])).values()];
  const stationList = page === "favorites" ? saved.filter((item) => props.profile.likedStationIds.includes(item.id)) : page === "history" ? props.profile.history.map((entry) => entry.station) : props.stations;
  const menu = [
    { label: t("page.now"), action: () => open("now") },
    { label: t("page.channels"), action: () => open("channels") },
    { label: t("page.regions"), action: () => open("regions") },
    { label: t("page.stations"), action: () => open("stations") },
    { label: t("page.search"), action: () => open("search") },
    { label: t("page.favorites"), action: () => open("favorites") },
    { label: t("page.history"), action: () => open("history") },
    { label: t("page.language"), action: () => open("language") },
    { label: t("page.support"), action: () => open("support") },
    { label: t("page.info"), action: () => open("info") },
  ];
  const channelRows = [
    { label: t("search.global"), action: () => { props.onGlobal(); open("now"); } },
    ...props.moods.map((item) => ({ label: item.label, action: () => { props.onMood(item.id); open("now"); } })),
    { label: t("search.china"), action: () => { props.onChina(); open("now"); } },
  ];
  const localeRows = LOCALES.map((item) => ({ label: `${item === locale ? "✓ " : ""}${LOCALE_LABELS[item]}`, action: () => { setLocale(item); open("menu"); } }));
  const regionRows = [
    { label: `${props.preferredCountryCode ? "" : "✓ "}${t("region.auto")}`, action: () => { props.onRegion(null); open("now"); } },
    ...RADIO_REGIONS.map((code) => ({ label: `${props.preferredCountryCode === code ? "✓ " : ""}${regionName(locale, code, code)}`, action: () => { props.onRegion(code); open("now"); } })),
  ];
  const rows = page === "menu" ? menu : page === "channels" ? channelRows : page === "regions" ? regionRows : page === "language" ? localeRows : stationList.map((item) => ({
    label: item.name,
    note: regionName(locale,item.countryCode,item.country),
    action: () => { props.onPlay(item); open("now"); },
  }));
  const listPage = ["menu", "channels", "regions", "stations", "favorites", "history", "language"].includes(page);

  useEffect(() => {
    screenRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const step = (direction: number) => {
    if (listPage) setSelected((value) => Math.max(0, Math.min(rows.length - 1, value + direction)));
    else direction > 0 ? props.onNext() : props.onPrevious();
  };
  const select = () => {
    if (listPage) rows[selected]?.action();
    else if (page === "now") props.onToggle();
    else open("now");
  };

  const navigation = (
    <div className="device-navigation" aria-label={t("page.menu")}>
      <button aria-label={t("page.now")} aria-pressed={page === "now"} onClick={() => open("now")}><Radio size={17} /></button>
      <button aria-label={t("page.channels")} aria-pressed={page === "channels"} onClick={() => open("channels")}><ListMusic size={17} /></button>
      <button aria-label={t("page.search")} aria-pressed={page === "search"} onClick={() => open("search")}><Search size={17} /></button>
      <button aria-label={t("page.favorites")} aria-pressed={page === "favorites"} onClick={() => open("favorites")}><Heart size={17} /></button>
      <button aria-label={t("page.history")} aria-pressed={page === "history"} onClick={() => open("history")}><History size={17} /></button>
      <button aria-label={t("page.info")} aria-pressed={page === "info"} onClick={() => open("info")}><Info size={17} /></button>
    </div>
  );

  const screen = (
    <div className="device-screen" ref={screenRef} onKeyDown={(event) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "Escape") { event.preventDefault(); back(); }
    }}>
      <div className="screen-title">
        <button aria-label={theme === "fantasy" && page !== "now" ? t("action.restore") : page === "now" ? t("action.menu") : t("action.back")} onClick={theme === "fantasy" && page !== "now" ? () => open("now") : back}>{page !== "now" && (theme === "fantasy" ? <ZoomOut size={15} /> : <ChevronLeft size={15} />)}<span>{titles[page]}</span>{page === "now" && <ChevronRight size={15} />}</button>
        <span aria-label={status}>{isLoading ? <LoaderCircle size={15} className="spinner" /> : isPlaying ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}</span>
      </div>
      <div className="screen-content">
        {page === "now" ? (
          <div className="now-playing">
            <div className="now-country">{station ? regionName(locale,station.countryCode,station.country) : "WORLD RADIO"} <span>{station?.codec || ""}</span></div>
            <h1>{track?.title || station?.name || t("now.title")}</h1>
            <p className="now-tags">{track ? `${track.artist} · ${station?.name}` : station ? `${station.tags.slice(0, 3).join(" · ")} · ${t("live.radio")}` : t("now.prompt")}</p>
            {deck && <div className={`spectrum ${isPlaying ? "active" : ""}`} aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ "--level": `${20 + i * 37 % 75}%`, "--delay": `${i * -0.13}s` } as React.CSSProperties} />)}</div>}
            <div className="now-bottom"><span className="signal-state"><i className={isPlaying ? "live" : ""} />{status}</span><span>{station?.bitrate ? `${station.bitrate} kbps` : "LIVE RADIO"}</span></div>

          </div>
        ) : page === "search" ? (
          <form className="device-search" onSubmit={(event) => { event.preventDefault(); props.onSearch(search.trim()); open("stations"); }}>
            <label htmlFor="radio-search">{t("search.name")}</label>
            <div><input id="radio-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={props.source === "china-curated" ? "北京、央广、音乐" : "Jazz24, FIP, KEXP…"} /><button aria-label={t("search.submit")}><Search size={18} /></button></div>
            <p>{t("search.current")}</p>
            <button type="button" className="source-choice" onClick={() => { props.onChina(); open("stations"); }}>{t("search.china")} <ChevronRight size={16} /></button>
            <button type="button" className="source-choice" onClick={() => { props.onGlobal(); open("stations"); }}>{t("search.global")} <ChevronRight size={16} /></button>
          </form>
        ) : page === "support" ? (
          <SupportPanel />
        ) : page === "info" ? (
          <div className="device-info"><h2>Qiaomu Radio</h2><p>{t("info.text")}</p>{station?.homepage && <a href={/^https?:\/\//.test(station.homepage) ? station.homepage : "#"} target="_blank" rel="noreferrer">{t("info.website")} <ExternalLink size={14} /></a>}<a href="https://www.radio-browser.info/" target="_blank" rel="noreferrer">Radio Browser <ExternalLink size={14} /></a></div>
        ) : (
          <div className="screen-list" aria-label={titles[page]}>
            {rows.map((row, index) => <button key={index} data-selected={selected === index} onFocus={() => setSelected(index)} onClick={row.action}><span>{row.label}</span><ChevronRight size={15} /></button>)}
            {!rows.length && <p className="device-empty">{isLoading ? t("empty.loading") : page === "favorites" ? t("empty.favorites") : page === "history" ? t("empty.history") : t("empty.stations")}</p>}
          </div>
        )}
      </div>
      {page === "now" && (
            <div className="track-actions">
              <button aria-label={liked ? t("action.unlike") : t("action.like")} aria-pressed={liked} disabled={!station} onClick={props.onLike}><Heart size={17} fill={liked ? "currentColor" : "none"} /><span>{t("action.like")}</span></button>
              <button aria-label={t("action.dislike")} disabled={!station} onClick={props.onDislike}><ThumbsDown size={16} /></button>
              <button aria-label={t("action.list")} onClick={() => open("stations")}><ListMusic size={17} /></button>
            </div>
      )}
      {(props.error || props.notice) && <div className={`device-message ${props.error ? "has-error" : ""}`} role={props.error ? "alert" : "status"}><span>{props.error || props.notice}</span>{props.error && <button onClick={props.onRetry}>{t("action.retry")}</button>}</div>}
      <div className="device-volume"><Volume2 size={14} /><input aria-label={t("action.volume")} type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => props.onVolume(Number(event.target.value))} /><span>{Math.round(volume * 100)}%</span></div>
    </div>
  );

  if (deck || consoleSkin) return <ClassicPlayer player={props} screen={screen} page={page} open={open} track={track} />;
  if (theme === "rams") return <Suspense fallback={<ModelLoader />}><NativeRadio player={props} track={track} /></Suspense>;
  if (theme === "fantasy") return <><FantasyModelPreload /><Suspense fallback={<ModelLoader fantasy />}><FantasyRadio player={props} screen={screen} page={page} open={open} track={track} /></Suspense></>;

  return (
    <section className={`radio-device device-${theme}`} aria-label={label}>
      {pocket ? <div className="device-engraving">iPod</div> :
        <div className="window-title"><span>{deck ? "WINAMP" : consoleSkin ? "foobar2000" : "Qiaomu Radio"}</span><span>{deck ? "● ● ●" : "LIVE RADIO"}</span></div>}
      {!pocket && navigation}
      {screen}
      {pocket ? (
        <div className="ipod-wheel" onWheel={(event) => {
          if (listPage) setSelected((value) => Math.max(0, Math.min(rows.length - 1, value + Math.sign(event.deltaY))));
          else props.onVolume(Math.max(0, Math.min(1, volume - Math.sign(event.deltaY) * 0.03)));
        }} onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); step(1); }
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
          if (event.key === "Escape") { event.preventDefault(); back(); }
        }}>
          <button className="wheel-menu" aria-label={t("page.menu")} onClick={back}>MENU</button>
          <button className="wheel-left" aria-label={t("action.previous")} onClick={() => step(-1)}><SkipBack size={24} fill="currentColor" /></button>
          <button className="wheel-right" aria-label={t("action.next")} onClick={() => step(1)}><SkipForward size={24} fill="currentColor" /></button>
          <button className="wheel-bottom" aria-label={isPlaying ? t("action.pause") : t("action.play")} onClick={props.onToggle}><Play size={17} fill="currentColor" /><Pause size={17} fill="currentColor" /></button>
          <button className="wheel-center" aria-label={listPage ? t("action.select") : isPlaying ? t("action.pause") : t("action.play")} onClick={select} />
        </div>
      ) : (
        <div className="device-transport">
          <button aria-label={t("action.previous")} onClick={props.onPrevious}><SkipBack size={21} fill="currentColor" /></button>
          <button className="transport-play" aria-label={isPlaying ? t("action.pause") : t("action.play")} onClick={props.onToggle}>{isLoading ? <LoaderCircle size={24} className="spinner" /> : isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
          <button aria-label={t("action.next")} onClick={props.onNext}><SkipForward size={21} fill="currentColor" /></button>
        </div>
      )}
      <div className="device-signature" aria-hidden="true">{pocket ? "THE WORLD IS ON AIR" : consoleSkin ? "Qiaomu Radio • Live stream" : "QIAOMU RADIO"}</div>
    </section>
  );
}

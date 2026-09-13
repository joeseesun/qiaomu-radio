import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClassicPlayer } from "./ClassicPlayer";
import { useNowPlaying } from "./useNowPlaying";
import { ChevronLeft, ChevronRight, Heart, History, ListMusic, Pause, Play, Search, SkipBack, SkipForward, ThumbsDown, Volume2, Radio, Info, LoaderCircle, ExternalLink, ZoomOut } from "lucide-react";
import type { MoodId, Station, StationSource, TasteProfile, ThemeId } from "./types";
import { SupportPanel } from "./SupportPanel";
import { ModelLoader } from "./ModelLoader";

type Page = "now" | "menu" | "channels" | "stations" | "favorites" | "history" | "search" | "info" | "support";
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
  onVolume: (volume: number) => void;
  onRetry: () => void;
};

const TITLES: Record<Page, string> = { now: "正在播放", menu: "乔木电台", channels: "频道", stations: "电台列表", favorites: "喜欢的电台", history: "最近收听", search: "搜索电台", info: "关于电台", support: "支持与关注" };

const NativeRadio = lazy(() => import("./NativeRadio"));
const FantasyRadio = lazy(() => import("./RamsRadio"));

export function PlayerSkin(props: PlayerProps) {
  const { theme, station, isPlaying, isLoading, volume, liked } = props;
  const [page, setPage] = useState<Page>("now");
  const [selected, setSelected] = useState(0);
  const [search, setSearch] = useState("");
  const screenRef = useRef<HTMLDivElement>(null);
  const track = useNowPlaying(station);
  const pocket = theme === "pocket";
  const deck = theme === "deck";
  const consoleSkin = theme === "console";
  const label = pocket ? "iPod 播放器" : deck ? "Winamp 播放器" : consoleSkin ? "foobar2000 播放器" : theme === "fantasy" ? "魔兽世界 3D 收音机" : theme === "rams" ? "博朗 3D 收音机" : theme === "china" ? "收音机" : "乔木播放器";
  const status = isLoading ? "连接中…" : isPlaying ? "正在直播" : "已暂停";

  const open = (next: Page) => { setPage(next); setSelected(0); };
  const back = () => open(page === "now" ? "menu" : page === "menu" ? "now" : "menu");
  const saved = [...new Map([...props.profile.history.map((entry) => entry.station), ...props.stations, ...(station ? [station] : [])].map((item) => [item.id, item])).values()];
  const stationList = page === "favorites" ? saved.filter((item) => props.profile.likedStationIds.includes(item.id)) : page === "history" ? props.profile.history.map((entry) => entry.station) : props.stations;
  const menu = [
    { label: "正在播放", action: () => open("now") },
    { label: "频道", action: () => open("channels") },
    { label: "电台列表", action: () => open("stations") },
    { label: "搜索电台", action: () => open("search") },
    { label: "喜欢的电台", action: () => open("favorites") },
    { label: "最近收听", action: () => open("history") },
    { label: "支持与关注", action: () => open("support") },
    { label: "关于电台", action: () => open("info") },
  ];
  const channelRows = [
    ...props.moods.map((item) => ({ label: item.label, action: () => { props.onMood(item.id); open("now"); } })),
    { label: "中国电台", action: () => { props.onChina(); open("now"); } },
  ];
  const rows = page === "menu" ? menu : page === "channels" ? channelRows : stationList.map((item) => ({
    label: item.name,
    note: item.country,
    action: () => { props.onPlay(item); open("now"); },
  }));
  const listPage = ["menu", "channels", "stations", "favorites", "history"].includes(page);

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
    <div className="device-navigation" aria-label="播放器功能">
      <button aria-label="正在播放" aria-pressed={page === "now"} onClick={() => open("now")}><Radio size={17} /></button>
      <button aria-label="频道" aria-pressed={page === "channels"} onClick={() => open("channels")}><ListMusic size={17} /></button>
      <button aria-label="搜索电台" aria-pressed={page === "search"} onClick={() => open("search")}><Search size={17} /></button>
      <button aria-label="喜欢的电台" aria-pressed={page === "favorites"} onClick={() => open("favorites")}><Heart size={17} /></button>
      <button aria-label="最近收听" aria-pressed={page === "history"} onClick={() => open("history")}><History size={17} /></button>
      <button aria-label="关于电台" aria-pressed={page === "info"} onClick={() => open("info")}><Info size={17} /></button>
    </div>
  );

  const screen = (
    <div className="device-screen" ref={screenRef} onKeyDown={(event) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "Escape") { event.preventDefault(); back(); }
    }}>
      <div className="screen-title">
        <button aria-label={theme === "fantasy" && page !== "now" ? "恢复原始视角" : page === "now" ? "打开菜单" : "返回菜单"} onClick={theme === "fantasy" && page !== "now" ? () => open("now") : back}>{page !== "now" && (theme === "fantasy" ? <ZoomOut size={15} /> : <ChevronLeft size={15} />)}<span>{TITLES[page]}</span>{page === "now" && <ChevronRight size={15} />}</button>
        <span aria-label={status}>{isLoading ? <LoaderCircle size={15} className="spinner" /> : isPlaying ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}</span>
      </div>
      <div className="screen-content">
        {page === "now" ? (
          <div className="now-playing">
            <div className="now-country">{station?.country || "WORLD RADIO"} <span>{station?.codec || ""}</span></div>
            <h1>{track?.title || station?.name || "此刻，听点什么"}</h1>
            <p className="now-tags">{track ? `${track.artist} · ${station?.name}` : station ? `${station.tags.slice(0, 3).join(" · ")} · 电台直播` : "按播放，遇见下一段声音。"}</p>
            {deck && <div className={`spectrum ${isPlaying ? "active" : ""}`} aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ "--level": `${20 + i * 37 % 75}%`, "--delay": `${i * -0.13}s` } as React.CSSProperties} />)}</div>}
            <div className="now-bottom"><span className="signal-state"><i className={isPlaying ? "live" : ""} />{status}</span><span>{station?.bitrate ? `${station.bitrate} kbps` : "LIVE RADIO"}</span></div>

          </div>
        ) : page === "search" ? (
          <form className="device-search" onSubmit={(event) => { event.preventDefault(); props.onSearch(search.trim()); open("stations"); }}>
            <label htmlFor="radio-search">电台名称</label>
            <div><input id="radio-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={props.source === "china-curated" ? "北京、央广、音乐" : "Jazz24、SomaFM…"} /><button aria-label="提交搜索"><Search size={18} /></button></div>
            <p>搜索当前电台来源</p>
            <button type="button" className="source-choice" onClick={() => { props.onChina(); open("stations"); }}>中国电台 <ChevronRight size={16} /></button>
            <button type="button" className="source-choice" onClick={() => { props.onMood(props.mood); open("stations"); }}>全球电台 <ChevronRight size={16} /></button>
          </form>
        ) : page === "support" ? (
          <SupportPanel />
        ) : page === "info" ? (
          <div className="device-info"><h2>乔木电台</h2><p>全球电台来自 Radio Browser，中国电台使用精选公开直播源。喜欢与收听记录保存在本机。</p>{station?.homepage && <a href={/^https?:\/\//.test(station.homepage) ? station.homepage : "#"} target="_blank" rel="noreferrer">电台官网 <ExternalLink size={14} /></a>}<a href="https://www.radio-browser.info/" target="_blank" rel="noreferrer">Radio Browser <ExternalLink size={14} /></a></div>
        ) : (
          <div className="screen-list" aria-label={TITLES[page]}>
            {rows.map((row, index) => <button key={index} data-selected={selected === index} onFocus={() => setSelected(index)} onClick={row.action}><span>{row.label}</span><ChevronRight size={15} /></button>)}
            {!rows.length && <p className="device-empty">{isLoading ? "正在寻找电台…" : page === "favorites" ? "按下爱心，把喜欢的声音留在这里。" : page === "history" ? "开始收听后，电台会留在这里。" : "还没有电台，去频道里选一种心情。"}</p>}
          </div>
        )}
      </div>
      {page === "now" && (
            <div className="track-actions">
              <button aria-label={liked ? "取消喜欢" : "喜欢这家电台"} aria-pressed={liked} disabled={!station} onClick={props.onLike}><Heart size={17} fill={liked ? "currentColor" : "none"} /><span>喜欢</span></button>
              <button aria-label="不喜欢并换台" disabled={!station} onClick={props.onDislike}><ThumbsDown size={16} /></button>
              <button aria-label="电台列表" onClick={() => open("stations")}><ListMusic size={17} /></button>
            </div>
      )}
      {(props.error || props.notice) && <div className={`device-message ${props.error ? "has-error" : ""}`} role={props.error ? "alert" : "status"}><span>{props.error || props.notice}</span>{props.error && <button onClick={props.onRetry}>重试</button>}</div>}
      <div className="device-volume"><Volume2 size={14} /><input aria-label="音量" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => props.onVolume(Number(event.target.value))} /><span>{Math.round(volume * 100)}%</span></div>
    </div>
  );

  if (deck || consoleSkin) return <ClassicPlayer player={props} screen={screen} page={page} open={open} track={track} />;
  if (theme === "rams") return <Suspense fallback={<ModelLoader />}><NativeRadio player={props} track={track} /></Suspense>;
  if (theme === "fantasy") return <Suspense fallback={<ModelLoader fantasy />}><FantasyRadio player={props} screen={screen} page={page} open={open} track={track} /></Suspense>;

  return (
    <section className={`radio-device device-${theme}`} aria-label={label}>
      {pocket ? <div className="device-engraving">iPod</div> :
        <div className="window-title"><span>{deck ? "WINAMP" : consoleSkin ? "foobar2000" : "乔木电台"}</span><span>{deck ? "● ● ●" : "LIVE RADIO"}</span></div>}
      {!pocket && navigation}
      {theme === "china" && <div className="tuner" aria-hidden="true"><span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span><i /></div>}
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
          <button className="wheel-menu" aria-label="菜单" onClick={back}>MENU</button>
          <button className="wheel-left" aria-label={listPage ? "上一项" : "上一家电台"} onClick={() => step(-1)}><SkipBack size={24} fill="currentColor" /></button>
          <button className="wheel-right" aria-label={listPage ? "下一项" : "下一家电台"} onClick={() => step(1)}><SkipForward size={24} fill="currentColor" /></button>
          <button className="wheel-bottom" aria-label={isPlaying ? "暂停" : "播放"} onClick={props.onToggle}><Play size={17} fill="currentColor" /><Pause size={17} fill="currentColor" /></button>
          <button className="wheel-center" aria-label={listPage ? "选择当前菜单项" : isPlaying ? "暂停" : "播放"} onClick={select} />
        </div>
      ) : (
        <div className="device-transport">
          <button aria-label="上一家电台" onClick={props.onPrevious}><SkipBack size={21} fill="currentColor" /></button>
          <button className="transport-play" aria-label={isPlaying ? "暂停" : "播放"} onClick={props.onToggle}>{isLoading ? <LoaderCircle size={24} className="spinner" /> : isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
          <button aria-label="下一家电台" onClick={props.onNext}><SkipForward size={21} fill="currentColor" /></button>
        </div>
      )}
      <div className="device-signature" aria-hidden="true">{pocket ? "THE WORLD IS ON AIR" : consoleSkin ? "Qiaomu Radio • Live stream" : "QIAOMU RADIO"}</div>
    </section>
  );
}

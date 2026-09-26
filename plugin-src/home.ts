import type QiaomuRadioPlugin from "./main";
import { homeProvider, type HomeItem, type HomeProvider } from "./qiaomu-home";
import type { Station } from "./types";

const MAX_ITEMS = 4;

function subtitle(station: Station): string {
  return [station.country, station.tags.slice(0, 2).join(" · ")].filter(Boolean).join(" · ");
}

/** Recent and favorite stations, newest first, without duplicates. */
function recentStations(plugin: QiaomuRadioPlugin): Station[] {
  const seen = new Set<string>();
  const stations: Station[] = [];
  for (const entry of plugin.data.profile.history) {
    if (seen.has(entry.station.id)) continue;
    seen.add(entry.station.id);
    stations.push(entry.station);
  }
  return stations;
}

/** What Qiaomu Radio shows on Qiaomu Home: the live station with play/pause, then recent stations to resume. */
export function createHomeProvider(plugin: QiaomuRadioPlugin): HomeProvider {
  const stationItem = (station: Station, queue: Station[]): HomeItem => {
    const state = plugin.player.snapshot();
    const current = state.station?.id === station.id;
    const playing = current && (state.status === "playing" || state.status === "loading");
    return {
      id: station.id,
      title: station.name,
      subtitle: subtitle(station),
      ...(current ? { meta: plugin.t(state.status === "playing" ? "直播中" : state.status === "loading" ? "正在连接直播…" : "已暂停") } : {}),
      icon: "radio",
      ...(station.favicon?.startsWith("https://") ? { image: station.favicon } : {}),
      ...(current ? { active: playing } : {}),
      open: () => current ? plugin.activateView() : plugin.playStation(station, queue),
      actions: [{
        id: "toggle",
        label: plugin.t(playing ? "暂停" : "播放"),
        icon: playing ? "pause" : "play",
        run: () => current ? plugin.player.toggle() : plugin.playStation(station, queue),
      }],
    };
  };

  return homeProvider({
    sections() {
      const queue = recentStations(plugin);
      const current = plugin.player.snapshot().station;
      const stations = current ? [current, ...queue.filter((station) => station.id !== current.id)] : queue;
      return [{
        id: "listening",
        title: plugin.t("继续听"),
        items: stations.slice(0, MAX_ITEMS).map((station) => stationItem(station, queue)),
        empty: plugin.t("还没有收听记录"),
        more: { id: "open", label: plugin.t("打开电台"), icon: "arrow-up-right", run: () => plugin.activateView() },
      }];
    },
    search(query, limit) {
      const q = query.toLowerCase();
      const queue = recentStations(plugin);
      return queue
        .filter((station) => station.name.toLowerCase().includes(q) || station.tags.some((tag) => tag.toLowerCase().includes(q)))
        .slice(0, limit)
        .map((station) => stationItem(station, queue));
    },
  });
}

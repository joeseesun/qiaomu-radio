import { ItemView, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import type QiaomuRadioPlugin from "./main";
import type { MoodId, PlayerState, Station } from "./types";

export const RADIO_VIEW_TYPE = "qiaomu-radio-view";
type ChannelId = MoodId | "favorites" | "history";

const CHANNELS: Array<{ id: ChannelId; label: string }> = [
  { id: "recommend", label: "为你推荐" },
  { id: "focus", label: "专注" },
  { id: "unwind", label: "松弛" },
  { id: "jazz", label: "爵士" },
  { id: "classical", label: "古典" },
  { id: "energy", label: "能量" },
  { id: "world", label: "世界" },
  { id: "favorites", label: "喜欢" },
  { id: "history", label: "最近" },
];

export class QiaomuRadioView extends ItemView {
  private channel: ChannelId;
  private query = "";
  private stations: Station[] = [];
  private loading = false;
  private error = "";
  private notice = "";
  private playerState: PlayerState;
  private unsubscribe: (() => void) | null = null;
  private requestGeneration = 0;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: QiaomuRadioPlugin) {
    super(leaf);
    this.channel = plugin.data.settings.defaultMood;
    this.playerState = plugin.player.snapshot();
  }

  getViewType(): string {
    return RADIO_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "乔木电台";
  }

  getIcon(): string {
    return "radio-tower";
  }

  async onOpen(): Promise<void> {
    this.unsubscribe = this.plugin.player.subscribe((state) => {
      this.playerState = state;
      this.render();
    });
    await this.loadStations();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  refreshProfile(): void {
    if (this.channel === "favorites" || this.channel === "history") {
      this.setLocalStations();
    }
    this.render();
  }

  private async loadStations(): Promise<void> {
    if (this.channel === "favorites" || this.channel === "history") {
      this.setLocalStations();
      this.render();
      return;
    }
    const generation = ++this.requestGeneration;
    this.loading = true;
    this.error = "";
    this.render();
    try {
      const result = await this.plugin.directory.stations(this.channel, this.query);
      if (generation !== this.requestGeneration) return;
      this.notice = result.notice;
      this.stations = this.channel === "recommend"
        ? this.plugin.rank(result.stations)
        : result.stations;
    } catch (error) {
      if (generation !== this.requestGeneration) return;
      this.error = error instanceof Error ? error.message : "暂时联系不上电台目录。";
      this.stations = [];
    } finally {
      if (generation === this.requestGeneration) {
        this.loading = false;
        this.render();
      }
    }
  }

  private setLocalStations(): void {
    const history = this.plugin.data.profile.history.map((entry) => entry.station);
    const unique = Array.from(new Map(history.map((station) => [station.id, station])).values());
    this.stations = this.channel === "favorites"
      ? unique.filter((station) => this.plugin.isLiked(station.id))
      : unique;
    if (this.channel === "recommend") this.stations = this.plugin.rank(unique);
    this.error = "";
    this.notice = "";
  }

  private render(): void {
    const root = this.containerEl.children[1];
    if (!root.instanceOf(HTMLElement)) return;
    root.empty();
    root.addClass("qiaomu-radio");

    const shell = root.createDiv({ cls: "qiaomu-radio__shell" });
    this.renderHeader(shell);
    this.renderNowPlaying(shell);
    this.renderChannels(shell);
    this.renderStations(shell);
  }

  private renderHeader(shell: HTMLElement): void {
    const header = shell.createEl("header", { cls: "qiaomu-radio__header" });
    const identity = header.createDiv({ cls: "qiaomu-radio__identity" });
    identity.createDiv({ cls: "qiaomu-radio__signal", attr: { "aria-hidden": "true" } });
    const copy = identity.createDiv();
    copy.createEl("h1", { text: "乔木电台" });
    copy.createEl("p", { text: "把世界的声音，放进你的笔记空间。" });

    const form = header.createEl("form", { cls: "qiaomu-radio__search" });
    const label = form.createEl("label", { cls: "qiaomu-radio__sr-only", text: "搜索电台" });
    const input = form.createEl("input", {
      type: "search",
      value: this.query,
      placeholder: "搜索电台或城市",
      attr: { "aria-labelledby": label.id || "" },
    });
    label.id = "qiaomu-radio-search-label";
    input.setAttribute("aria-labelledby", label.id);
    const button = form.createEl("button", { type: "submit", text: "搜索" });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.query = input.value.trim().slice(0, 80);
      if (this.channel === "favorites" || this.channel === "history") this.channel = "recommend";
      void this.loadStations();
    });
    if (this.query) {
      const clear = form.createEl("button", { type: "button", text: "清除", cls: "qiaomu-radio__quiet-button" });
      clear.addEventListener("click", () => {
        this.query = "";
        input.value = "";
        input.focus();
        void this.loadStations();
      });
    }
    button.setAttribute("aria-label", "搜索电台");
  }

  private renderNowPlaying(shell: HTMLElement): void {
    const state = this.playerState;
    const player = shell.createEl("section", { cls: "qiaomu-radio__player" });
    const top = player.createDiv({ cls: "qiaomu-radio__player-top" });
    const stationCopy = top.createDiv({ cls: "qiaomu-radio__on-air" });
    stationCopy.createSpan({ text: state.status === "playing" ? "● ON AIR" : "QIAOMU / LIVE" });
    stationCopy.createEl("h2", { text: state.station?.name ?? "选一家电台，立即开始" });
    stationCopy.createEl("p", { text: state.station ? `${state.station.country || "全球"} · ${state.station.codec || "LIVE"}` : state.message });
    if (state.station) stationCopy.createEl("small", { text: state.message });

    const controls = top.createDiv({ cls: "qiaomu-radio__controls" });
    const previous = controls.createEl("button", { text: "上一家" });
    previous.disabled = !state.station;
    previous.addEventListener("click", () => void this.plugin.previous());
    const toggle = controls.createEl("button", { cls: "qiaomu-radio__primary-control" });
    setIcon(toggle, state.status === "playing" ? "pause" : "play");
    toggle.createSpan({ cls: "qiaomu-radio__sr-only", text: state.status === "playing" ? "暂停" : "播放" });
    toggle.disabled = !state.station;
    toggle.addEventListener("click", () => this.plugin.player.toggle());
    const next = controls.createEl("button", { text: "下一家" });
    next.disabled = this.stations.length === 0;
    next.addEventListener("click", () => void this.plugin.next(true));

    const volumeRow = player.createDiv({ cls: "qiaomu-radio__volume" });
    volumeRow.createSpan({ text: "音量" });
    const volume = volumeRow.createEl("input", {
      type: "range",
      value: String(Math.round(state.volume * 100)),
      attr: { min: "0", max: "100", step: "1", "aria-label": "音量" },
    });
    volume.addEventListener("change", () => this.plugin.setVolume(Number(volume.value) / 100));
    volumeRow.createSpan({ text: `${Math.round(state.volume * 100)}%` });
  }

  private renderChannels(shell: HTMLElement): void {
    const nav = shell.createEl("nav", { cls: "qiaomu-radio__channels", attr: { "aria-label": "电台频道" } });
    CHANNELS.forEach((channel) => {
      const button = nav.createEl("button", { text: channel.label });
      const selected = channel.id === this.channel;
      button.toggleClass("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.addEventListener("click", () => {
        this.channel = channel.id;
        this.query = "";
        void this.loadStations();
      });
    });
  }

  private renderStations(shell: HTMLElement): void {
    const section = shell.createEl("section", { cls: "qiaomu-radio__directory" });
    const heading = section.createDiv({ cls: "qiaomu-radio__section-heading" });
    heading.createEl("h2", { text: CHANNELS.find((item) => item.id === this.channel)?.label ?? "电台" });
    heading.createSpan({ text: this.loading ? "正在寻找信号…" : `${this.stations.length} 家电台` });
    if (this.notice) section.createEl("p", { cls: "qiaomu-radio__notice", text: this.notice });
    if (this.error) {
      const error = section.createDiv({ cls: "qiaomu-radio__empty" });
      error.createEl("p", { text: this.error });
      const retry = error.createEl("button", { text: "重新连接" });
      retry.addEventListener("click", () => void this.loadStations());
      return;
    }
    if (!this.loading && this.stations.length === 0) {
      section.createEl("p", { cls: "qiaomu-radio__empty", text: this.channel === "favorites" ? "喜欢的电台会留在这里。" : "还没有收听记录。" });
      return;
    }
    const list = section.createDiv({ cls: "qiaomu-radio__station-grid" });
    this.stations.slice(0, 60).forEach((station) => this.renderStation(list, station));
  }

  private renderStation(list: HTMLElement, station: Station): void {
    const current = this.playerState.station?.id === station.id;
    const card = list.createEl("article", { cls: `qiaomu-radio__station${current ? " is-current" : ""}` });
    const play = card.createEl("button", { cls: "qiaomu-radio__station-main" });
    const monogram = play.createSpan({ cls: "qiaomu-radio__monogram", text: station.name.slice(0, 1).toUpperCase() });
    monogram.setAttribute("aria-hidden", "true");
    const copy = play.createSpan({ cls: "qiaomu-radio__station-copy" });
    copy.createEl("strong", { text: station.name });
    copy.createSpan({ text: `${station.country || "全球"}${station.tags[0] ? ` · ${station.tags[0]}` : ""}` });
    play.addEventListener("click", () => void this.plugin.playStation(station, this.stations));
    const like = card.createEl("button", { cls: "qiaomu-radio__like" });
    const liked = this.plugin.isLiked(station.id);
    setIcon(like, "heart");
    like.toggleClass("is-liked", liked);
    like.createSpan({ cls: "qiaomu-radio__sr-only", text: liked ? "取消喜欢" : "喜欢" });
    like.setAttribute("aria-pressed", String(liked));
    like.addEventListener("click", () => {
      this.plugin.toggleLike(station);
      new Notice(liked ? "已取消喜欢" : "已加入喜欢");
    });
  }
}

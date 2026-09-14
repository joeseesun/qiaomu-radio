import { ItemView, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import type QiaomuRadioPlugin from "./main";
import { stationRowContent } from "./station-row";
import { RADIO_THEMES } from "./themes";
import type { MoodId, PlayerState, Station } from "./types";

export const RADIO_VIEW_TYPE = "qiaomu-radio-view";
type ChannelId = MoodId | "favorites" | "history";
type PocketPage = "menu" | "now" | "stations" | "channels" | "search" | "favorites" | "history";

const CHANNELS: Array<{ id: ChannelId; label: string; icon?: string }> = [
  { id: "recommend", label: "推荐" },
  { id: "focus", label: "专注" },
  { id: "unwind", label: "松弛" },
  { id: "jazz", label: "爵士" },
  { id: "classical", label: "古典" },
  { id: "energy", label: "能量" },
  { id: "world", label: "世界" },
  { id: "favorites", label: "喜欢", icon: "heart" },
  { id: "history", label: "最近", icon: "history" },
];

export class QiaomuRadioView extends ItemView {
  private channel: ChannelId;
  private filterQuery = "";
  private directoryQuery = "";
  private stations: Station[] = [];
  private loading = false;
  private error = "";
  private notice = "";
  private playerState: PlayerState;
  private pocketPage: PocketPage = "menu";
  private unsubscribe: (() => void) | null = null;
  private requestGeneration = 0;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: QiaomuRadioPlugin) {
    super(leaf);
    this.channel = plugin.data.settings.defaultMood;
    this.playerState = plugin.player.snapshot();
  }

  getViewType(): string { return RADIO_VIEW_TYPE; }
  getDisplayText(): string { return "乔木电台"; }
  getIcon(): string { return "radio-tower"; }

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
    if (this.channel === "favorites" || this.channel === "history") this.setLocalStations();
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
      const result = await this.plugin.directory.stations(this.channel, this.directoryQuery);
      if (generation !== this.requestGeneration) return;
      this.notice = result.notice;
      this.stations = this.channel === "recommend" ? this.plugin.rank(result.stations) : result.stations;
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
    this.error = "";
    this.notice = "";
    this.loading = false;
  }

  private visibleStations(): Station[] {
    const query = this.filterQuery.trim().toLocaleLowerCase();
    if (!query) return this.stations;
    return this.stations.filter((station) => [station.name, station.country, station.language, station.codec, ...station.tags]
      .join(" ").toLocaleLowerCase().includes(query));
  }

  private render(): void {
    const root = this.containerEl.children[1];
    if (!root.instanceOf(HTMLElement)) return;
    root.empty();
    root.addClass("qiaomu-radio");
    root.dataset.theme = this.plugin.data.settings.theme;

    const shell = root.createDiv({ cls: "qiaomu-radio__shell" });
    if (this.plugin.data.settings.theme === "pocket") {
      this.renderPocket(shell);
      return;
    }
    const device = shell.createEl("section", { cls: "qiaomu-radio__device" });
    this.renderModeSwitch(device);
    const body = device.createDiv({ cls: "qiaomu-radio__body" });
    this.renderPlayer(body);
    this.renderDirectory(body);
  }

  private renderPocket(shell: HTMLElement): void {
    const state = this.playerState;
    const ipod = shell.createEl("section", { cls: "qiaomu-radio__ipod" });
    const top = ipod.createDiv({ cls: "qiaomu-radio__ipod-top" });
    top.createSpan({ text: "iPod" });
    const original = top.createEl("button", { text: "返回原版" });
    original.addEventListener("click", () => this.plugin.setTheme("classic"));

    const screen = ipod.createDiv({ cls: "qiaomu-radio__ipod-screen" });
    const screenBar = screen.createDiv({ cls: "qiaomu-radio__ipod-screen-bar" });
    const back = screenBar.createEl("button");
    setIcon(back, "chevron-left");
    this.addScreenReaderText(back, "返回菜单");
    back.disabled = this.pocketPage === "menu";
    back.addEventListener("click", () => {
      this.pocketPage = "menu";
      this.render();
    });
    screenBar.createEl("strong", { text: this.pocketTitle() });
    const playback = screenBar.createEl("button");
    setIcon(playback, state.status === "playing" ? "pause" : "play");
    this.addScreenReaderText(playback, state.status === "playing" ? "暂停" : "播放");
    playback.disabled = !state.station;
    playback.addEventListener("click", () => this.plugin.player.toggle());

    const screenBody = screen.createDiv({ cls: `qiaomu-radio__ipod-content is-${this.pocketPage}` });
    this.renderPocketContent(screenBody);
    this.renderPocketVolume(screen);
    this.renderPocketWheel(ipod);
    ipod.createDiv({ cls: "qiaomu-radio__ipod-signature", text: "THE WORLD IS ON AIR" });
  }

  private pocketTitle(): string {
    if (this.pocketPage === "now") return "正在播放";
    if (this.pocketPage === "stations") return "电台列表";
    if (this.pocketPage === "channels") return "频道";
    if (this.pocketPage === "search") return "搜索电台";
    if (this.pocketPage === "favorites") return "喜欢";
    if (this.pocketPage === "history") return "最近";
    return "乔木电台";
  }

  private renderPocketContent(content: HTMLElement): void {
    if (this.pocketPage === "menu") {
      const items: Array<{ page: PocketPage; label: string }> = [
        { page: "now", label: "正在播放" },
        { page: "channels", label: "频道" },
        { page: "stations", label: "电台列表" },
        { page: "search", label: "搜索电台" },
        { page: "favorites", label: "喜欢" },
        { page: "history", label: "最近" },
      ];
      items.forEach((item, index) => {
        const button = content.createEl("button", { cls: `qiaomu-radio__ipod-menu-row${index === 0 ? " is-primary" : ""}` });
        button.createSpan({ text: item.label });
        const arrow = button.createSpan({ attr: { "aria-hidden": "true" } });
        setIcon(arrow, "chevron-right");
        button.addEventListener("click", () => this.openPocketPage(item.page));
      });
      return;
    }

    if (this.pocketPage === "now") {
      const station = this.playerState.station;
      const now = content.createDiv({ cls: "qiaomu-radio__ipod-now" });
      now.createSpan({ text: this.playerState.status === "playing" ? "ON AIR" : "READY" });
      now.createEl("h2", { text: station?.name ?? "还没有播放电台" });
      now.createEl("p", { text: station ? `${station.country || "全球"} · ${station.tags[0] || station.codec || "LIVE"}` : "从电台列表选择一家开始。" });
      if (station) {
        const liked = this.plugin.isLiked(station.id);
        const like = now.createEl("button", { attr: { "aria-pressed": String(liked) } });
        setIcon(like, "heart");
        like.createSpan({ text: liked ? "已喜欢" : "加入喜欢" });
        like.toggleClass("is-liked", liked);
        like.addEventListener("click", () => this.plugin.toggleLike(station));
      }
      return;
    }

    if (this.pocketPage === "channels") {
      const list = content.createDiv({ cls: "qiaomu-radio__ipod-options" });
      CHANNELS.forEach((channel) => {
        const button = list.createEl("button", { attr: { "aria-pressed": String(channel.id === this.channel) } });
        button.createSpan({ text: channel.label });
        const icon = button.createSpan({ attr: { "aria-hidden": "true" } });
        setIcon(icon, channel.id === this.channel ? "check" : "chevron-right");
        button.addEventListener("click", () => {
          this.channel = channel.id;
          this.directoryQuery = "";
          this.filterQuery = "";
          this.pocketPage = channel.id === "favorites" || channel.id === "history" ? channel.id : "stations";
          void this.loadStations();
        });
      });
      return;
    }

    if (this.pocketPage === "search") {
      const form = content.createEl("form", { cls: "qiaomu-radio__ipod-search" });
      const searchId = "qiaomu-radio-pocket-search";
      form.createEl("label", { cls: "qiaomu-radio__sr-only", text: "搜索电台", attr: { for: searchId } });
      const input = form.createEl("input", { type: "search", value: this.filterQuery, attr: { id: searchId, placeholder: "电台名称或城市" } });
      const button = form.createEl("button", { type: "submit", text: "搜索" });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.directoryQuery = input.value.trim().slice(0, 80);
        this.filterQuery = "";
        this.channel = "recommend";
        this.pocketPage = "stations";
        void this.loadStations();
      });
      button.disabled = this.loading;
      return;
    }

    const results = content.createDiv({ cls: "qiaomu-radio__ipod-results" });
    this.renderPocketStations(results);
  }

  private openPocketPage(page: PocketPage): void {
    this.pocketPage = page;
    if (page === "favorites" || page === "history") {
      this.channel = page;
      this.directoryQuery = "";
      this.filterQuery = "";
      this.setLocalStations();
    }
    this.render();
  }

  private renderPocketStations(results: HTMLElement): void {
    if (this.loading) {
      results.createEl("p", { cls: "qiaomu-radio__ipod-empty", text: "正在寻找信号…" });
      return;
    }
    if (this.error) {
      const retry = results.createEl("button", { cls: "qiaomu-radio__ipod-empty", text: "连接失败，点按重试" });
      retry.addEventListener("click", () => void this.loadStations());
      return;
    }
    const stations = this.visibleStations().slice(0, 60);
    if (stations.length === 0) {
      results.createEl("p", { cls: "qiaomu-radio__ipod-empty", text: this.channel === "favorites" ? "还没有喜欢的电台" : "还没有收听记录" });
      return;
    }
    stations.forEach((station) => {
      const current = this.playerState.station?.id === station.id;
      const button = results.createEl("button", { cls: `qiaomu-radio__ipod-station${current ? " is-current" : ""}` });
      const copy = button.createSpan();
      copy.createEl("strong", { text: stationRowContent(station, 0, false).name });
      copy.createSpan({ text: `${station.country || "全球"} · ${station.tags[0] || station.codec || "LIVE"}` });
      const icon = button.createSpan({ attr: { "aria-hidden": "true" } });
      setIcon(icon, current && this.playerState.status === "playing" ? "audio-lines" : "chevron-right");
      button.addEventListener("click", () => {
        this.pocketPage = "now";
        void this.plugin.playStation(station, stations);
      });
    });
  }

  private renderPocketVolume(screen: HTMLElement): void {
    const volume = screen.createDiv({ cls: "qiaomu-radio__ipod-volume" });
    const icon = volume.createSpan({ attr: { "aria-hidden": "true" } });
    setIcon(icon, this.playerState.volume === 0 ? "volume-x" : "volume-2");
    const volumeId = "qiaomu-radio-pocket-volume";
    volume.createEl("label", { cls: "qiaomu-radio__sr-only", text: "音量", attr: { for: volumeId } });
    const slider = volume.createEl("input", { type: "range", value: String(Math.round(this.playerState.volume * 100)), attr: { id: volumeId, min: "0", max: "100", step: "1" } });
    slider.addEventListener("change", () => this.plugin.setVolume(Number(slider.value) / 100));
    volume.createSpan({ text: `${Math.round(this.playerState.volume * 100)}%` });
  }

  private renderPocketWheel(ipod: HTMLElement): void {
    const wheel = ipod.createDiv({ cls: "qiaomu-radio__wheel" });
    const menu = wheel.createEl("button", { cls: "qiaomu-radio__wheel-menu", text: "MENU" });
    menu.addEventListener("click", () => {
      this.pocketPage = "menu";
      this.render();
    });
    const previous = wheel.createEl("button", { cls: "qiaomu-radio__wheel-previous" });
    setIcon(previous, "skip-back");
    this.addScreenReaderText(previous, "上一家电台");
    previous.disabled = !this.playerState.station;
    previous.addEventListener("click", () => void this.plugin.previous());
    const next = wheel.createEl("button", { cls: "qiaomu-radio__wheel-next" });
    setIcon(next, "skip-forward");
    this.addScreenReaderText(next, "下一家电台");
    next.disabled = !this.playerState.station && this.stations.length === 0;
    next.addEventListener("click", () => void this.plugin.next(true));
    const toggle = wheel.createEl("button", { cls: "qiaomu-radio__wheel-toggle" });
    setIcon(toggle, this.playerState.status === "playing" ? "pause" : "play");
    this.addScreenReaderText(toggle, this.playerState.status === "playing" ? "暂停" : "播放");
    toggle.disabled = !this.playerState.station;
    toggle.addEventListener("click", () => this.plugin.player.toggle());
    const center = wheel.createEl("button", { cls: "qiaomu-radio__wheel-center" });
    this.addScreenReaderText(center, "播放或暂停");
    center.addEventListener("click", () => this.plugin.player.toggle());
  }

  private renderModeSwitch(device: HTMLElement): void {
    const modes = device.createDiv({ cls: "qiaomu-radio__modes" });
    RADIO_THEMES.forEach((theme) => {
      const selected = theme.id === this.plugin.data.settings.theme;
      const button = modes.createEl("button", { text: theme.label, attr: { "aria-pressed": String(selected) } });
      button.addEventListener("click", () => this.plugin.setTheme(theme.id));
    });
  }

  private renderPlayer(body: HTMLElement): void {
    const state = this.playerState;
    const station = state.station;
    const player = body.createEl("section", { cls: "qiaomu-radio__player" });
    const status = player.createDiv({ cls: "qiaomu-radio__status" });
    status.createSpan({ cls: `qiaomu-radio__status-dot is-${state.status}`, attr: { "aria-hidden": "true" } });
    status.createSpan({ cls: "qiaomu-radio__status-text", text: state.message });
    if (station) {
      const liked = this.plugin.isLiked(station.id);
      const like = status.createEl("button", { cls: `qiaomu-radio__status-like${liked ? " is-liked" : ""}`, attr: { "aria-pressed": String(liked) } });
      setIcon(like, "heart");
      this.addScreenReaderText(like, liked ? "取消喜欢" : "喜欢");
      like.addEventListener("click", () => {
        this.plugin.toggleLike(station);
        new Notice(liked ? "已取消喜欢" : "已加入喜欢");
      });
    }

    const now = player.createDiv({ cls: "qiaomu-radio__now" });
    now.createSpan({ cls: "qiaomu-radio__eyebrow", text: station ? `${station.country || "全球"} · ${station.codec || "LIVE"}` : "LIVE RADIO" });
    now.createEl("h1", { text: station?.name ?? "选一家电台" });
    now.createEl("p", { text: station ? station.tags.slice(0, 3).join(" · ") || "全球直播电台" : "不用离开笔记，听见世界。" });

    const spectrum = player.createDiv({ cls: `qiaomu-radio__spectrum${state.status === "playing" ? " is-playing" : ""}`, attr: { "aria-hidden": "true" } });
    for (let index = 0; index < 18; index += 1) {
      const bar = spectrum.createSpan();
      bar.style.setProperty("--qr-bar", String((index * 7) % 11));
    }
    this.renderTransport(player);
  }

  private renderTransport(player: HTMLElement): void {
    const state = this.playerState;
    const transport = player.createDiv({ cls: "qiaomu-radio__transport" });
    const previous = transport.createEl("button");
    setIcon(previous, "skip-back");
    this.addScreenReaderText(previous, "上一家电台");
    previous.disabled = !state.station;
    previous.addEventListener("click", () => void this.plugin.previous());

    const toggle = transport.createEl("button", { cls: "qiaomu-radio__play" });
    setIcon(toggle, state.status === "playing" ? "pause" : "play");
    this.addScreenReaderText(toggle, state.status === "playing" ? "暂停" : "播放");
    toggle.disabled = !state.station;
    toggle.addEventListener("click", () => this.plugin.player.toggle());

    const next = transport.createEl("button");
    setIcon(next, "skip-forward");
    this.addScreenReaderText(next, "下一家电台");
    next.disabled = !state.station && this.stations.length === 0;
    next.addEventListener("click", () => void this.plugin.next(true));

    const volume = transport.createDiv({ cls: "qiaomu-radio__volume" });
    const icon = volume.createSpan({ attr: { "aria-hidden": "true" } });
    setIcon(icon, state.volume === 0 ? "volume-x" : "volume-2");
    const volumeId = "qiaomu-radio-volume";
    volume.createEl("label", { cls: "qiaomu-radio__sr-only", text: "音量", attr: { for: volumeId } });
    const slider = volume.createEl("input", { type: "range", value: String(Math.round(state.volume * 100)), attr: { id: volumeId, min: "0", max: "100", step: "1" } });
    slider.addEventListener("change", () => this.plugin.setVolume(Number(slider.value) / 100));
    volume.createSpan({ text: `${Math.round(state.volume * 100)}%` });
  }

  private renderDirectory(body: HTMLElement): void {
    const directory = body.createEl("section", { cls: "qiaomu-radio__directory" });
    const form = directory.createEl("form", { cls: "qiaomu-radio__search" });
    const icon = form.createSpan({ attr: { "aria-hidden": "true" } });
    setIcon(icon, "search");
    const searchId = "qiaomu-radio-search";
    form.createEl("label", { cls: "qiaomu-radio__sr-only", text: "搜索电台", attr: { for: searchId } });
    const input = form.createEl("input", { type: "search", value: this.filterQuery, attr: { id: searchId, placeholder: "筛选当前列表，回车搜索全球" } });
    const submit = form.createEl("button", { type: "submit", text: "搜索全球" });

    const channels = directory.createEl("nav", { cls: "qiaomu-radio__channels" });
    CHANNELS.forEach((channel) => {
      const selected = channel.id === this.channel && !this.directoryQuery;
      const button = channels.createEl("button", { attr: { "aria-pressed": String(selected) } });
      if (channel.icon) {
        const channelIcon = button.createSpan({ attr: { "aria-hidden": "true" } });
        setIcon(channelIcon, channel.icon);
      }
      button.createSpan({ text: channel.label });
      button.addEventListener("click", () => {
        this.channel = channel.id;
        this.filterQuery = "";
        this.directoryQuery = "";
        void this.loadStations();
      });
    });

    const results = directory.createDiv({ cls: "qiaomu-radio__results" });
    // The submit action only earns its place once there is something to search for;
    // toggling it here keeps the rule out of CSS, where :has triggers a lint warning.
    const syncSubmit = (): void => { submit.hidden = input.value.trim().length === 0; };
    input.addEventListener("input", () => {
      this.filterQuery = input.value.slice(0, 80);
      syncSubmit();
      this.renderStationResults(results);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.directoryQuery = input.value.trim().slice(0, 80);
      this.filterQuery = "";
      this.channel = "recommend";
      void this.loadStations();
    });
    submit.disabled = this.loading;
    syncSubmit();
    this.renderStationResults(results);
  }

  private renderStationResults(results: HTMLElement): void {
    results.empty();
    const visible = this.visibleStations();
    const heading = results.createDiv({ cls: "qiaomu-radio__results-heading" });
    const channelLabel = CHANNELS.find((item) => item.id === this.channel)?.label ?? "电台";
    heading.createEl("h2", { text: this.directoryQuery ? `“${this.directoryQuery}”` : channelLabel });
    heading.createSpan({ text: this.loading ? "正在寻找信号…" : `${visible.length} 家` });

    if (this.error) {
      const empty = results.createDiv({ cls: "qiaomu-radio__empty" });
      empty.createEl("p", { text: this.error });
      const retry = empty.createEl("button", { text: "重新连接" });
      retry.addEventListener("click", () => void this.loadStations());
      return;
    }
    if (this.loading) {
      results.createEl("p", { cls: "qiaomu-radio__empty", text: "正在扫描可用电台…" });
      return;
    }
    if (this.notice) results.createEl("p", { cls: "qiaomu-radio__notice", text: this.notice });
    if (visible.length === 0) {
      const text = this.filterQuery ? "当前列表没有匹配项，按回车搜索全球目录。"
        : this.channel === "favorites" ? "点亮红心的电台会留在这里。"
          : this.channel === "history" ? "播放过的电台会按最近顺序出现。" : "没有找到可用电台。";
      results.createEl("p", { cls: "qiaomu-radio__empty", text });
      return;
    }

    const list = results.createDiv({ cls: "qiaomu-radio__station-list" });
    visible.slice(0, 60).forEach((station, index) => this.renderStation(list, station, index));
  }

  private renderStation(list: HTMLElement, station: Station, index: number): void {
    const liked = this.plugin.isLiked(station.id);
    const rowContent = stationRowContent(station, index, liked);
    const current = this.playerState.station?.id === station.id;
    const row = list.createDiv({ cls: `qiaomu-radio__station${current ? " is-current" : ""}` });
    const rowState = row.createSpan({ cls: "qiaomu-radio__station-index", attr: { "aria-hidden": "true" } });
    if (current && this.playerState.status === "playing") setIcon(rowState, "audio-lines");
    else rowState.setText(String(rowContent.index));
    const play = row.createEl("button", { cls: "qiaomu-radio__station-main" });
    const copy = play.createSpan({ cls: "qiaomu-radio__station-copy" });
    copy.createEl("strong", { text: rowContent.name });
    const meta = copy.createSpan({ cls: "qiaomu-radio__station-meta" });
    meta.createSpan({ cls: "qiaomu-radio__station-where", text: rowContent.meta });
    meta.createSpan({ cls: "qiaomu-radio__station-quality", text: rowContent.quality });
    play.addEventListener("click", () => void this.plugin.playStation(station, this.visibleStations()));

    const like = row.createEl("button", { cls: "qiaomu-radio__station-like", attr: { "aria-pressed": String(rowContent.liked) } });
    setIcon(like, "heart");
    this.addScreenReaderText(like, rowContent.likeLabel);
    like.toggleClass("is-liked", rowContent.liked);
    like.addEventListener("click", () => this.plugin.toggleLike(station));
  }

  private addScreenReaderText(element: HTMLElement, text: string): void {
    element.createSpan({ cls: "qiaomu-radio__sr-only", text });
  }
}

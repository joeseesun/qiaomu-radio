import { ItemView, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import type QiaomuRadioPlugin from "./main";
import { stationRowContent } from "./station-row";
import { resolveLocale, translate, displayName } from "./i18n";
import { BROWSE_GROUPS, LANGUAGES, REGIONS, genreLabel, type DirectoryFilter } from "./catalog";
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
  private t(source: string): string { return translate(source, resolveLocale(this.plugin.data.settings.language)); }
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
  private browseFilter: DirectoryFilter = {};
  private browseOpen = false;
  private browseDraft: DirectoryFilter = {};
  private closed = false;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: QiaomuRadioPlugin) {
    super(leaf);
    this.channel = plugin.data.settings.defaultMood;
    this.playerState = plugin.player.snapshot();
  }

  getViewType(): string { return RADIO_VIEW_TYPE; }
  getDisplayText(): string { return this.t("乔木电台"); }
  getIcon(): string { return "radio-tower"; }

  async onOpen(): Promise<void> {
    this.unsubscribe = this.plugin.player.subscribe((state) => {
      this.playerState = state;
      this.render();
    });
    await this.loadStations();
  }

  async onClose(): Promise<void> {
    this.closed = true;
    this.requestGeneration++;
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  refreshProfile(): void {
    if (this.channel === "favorites" || this.channel === "history") this.setLocalStations();
    this.render();
  }

  private async loadStations(): Promise<void> {
    const generation = ++this.requestGeneration;
    if (this.channel === "favorites" || this.channel === "history") {
      this.setLocalStations();
      this.render();
      return;
    }
    const channel = this.channel;
    const cached = this.plugin.directory.cached?.(channel, this.directoryQuery, this.browseFilter);
    this.stations = cached?.stations ?? [];
    const personalize = channel === "recommend" && !this.directoryQuery && !Object.keys(this.browseFilter).length;
    if (cached && personalize) this.stations = this.plugin.rank(this.stations);
    this.loading = !cached;
    this.notice = "";
    this.error = "";
    this.render();
    try {
      const result = Object.keys(this.browseFilter).length
        ? await this.plugin.directory.stations(channel, this.directoryQuery, this.browseFilter)
        : await this.plugin.directory.stations(channel, this.directoryQuery);
      if (generation !== this.requestGeneration || this.closed) return;
      this.notice = result.notice;
      this.stations = personalize ? this.plugin.rank(result.stations) : result.stations;
    } catch (error) {
      if (generation !== this.requestGeneration || this.closed) return;
      this.error = error instanceof Error ? error.message : this.t("暂时联系不上电台目录。");
    } finally {
      if (generation === this.requestGeneration && !this.closed) {
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
    const oldResults = root.querySelector?.<HTMLElement>(".qiaomu-radio__station-list");
    const scrollTop = oldResults?.scrollTop ?? 0;
    const active = root.ownerDocument?.activeElement as HTMLElement | null;
    const focusKey = active?.dataset?.focusKey;
    root.empty();
    root.addClass("qiaomu-radio");
    root.dataset.theme = this.plugin.data.settings.theme;
    root.lang = resolveLocale(this.plugin.data.settings.language);
    root.dir = root.lang === "ar" ? "rtl" : "ltr";

    const shell = root.createDiv({ cls: "qiaomu-radio__shell" });
    if (this.plugin.data.settings.theme === "pocket") {
      this.renderPocket(shell);
      return;
    }
    const device = shell.createEl("section", { cls: "qiaomu-radio__device" });
    const body = device.createDiv({ cls: "qiaomu-radio__body" });
    this.renderPlayer(body);
    this.renderDirectory(body);
    const newResults = root.querySelector?.<HTMLElement>(".qiaomu-radio__station-list");
    if (newResults) newResults.scrollTop = scrollTop;
    if (focusKey) root.querySelector?.<HTMLElement>(`[data-focus-key="${focusKey}"]`)?.focus({ preventScroll: true });
  }

  private renderPocket(shell: HTMLElement): void {
    const state = this.playerState;
    const ipod = shell.createEl("section", { cls: "qiaomu-radio__ipod" });
    const top = ipod.createDiv({ cls: "qiaomu-radio__ipod-top" });
    top.createSpan({ text: "iPod" });
    const original = top.createEl("button", { text: this.t("返回原版") });
    original.addEventListener("click", () => this.plugin.setTheme("classic"));

    const screen = ipod.createDiv({ cls: "qiaomu-radio__ipod-screen" });
    const screenBar = screen.createDiv({ cls: "qiaomu-radio__ipod-screen-bar" });
    const back = screenBar.createEl("button");
    setIcon(back, "chevron-left");
    this.addScreenReaderText(back, this.t("返回菜单"));
    back.disabled = this.pocketPage === "menu";
    back.addEventListener("click", () => {
      this.pocketPage = "menu";
      this.render();
    });
    screenBar.createEl("strong", { text: this.pocketTitle() });
    const playback = screenBar.createEl("button");
    setIcon(playback, state.status === "playing" ? "pause" : "play");
    this.addScreenReaderText(playback, state.status === "playing" ? this.t("暂停") : this.t("播放"));
    playback.disabled = !state.station;
    playback.addEventListener("click", () => this.plugin.player.toggle());

    const screenBody = screen.createDiv({ cls: `qiaomu-radio__ipod-content is-${this.pocketPage}` });
    this.renderPocketContent(screenBody);
    this.renderPocketVolume(screen);
    this.renderPocketWheel(ipod);
    ipod.createDiv({ cls: "qiaomu-radio__ipod-signature", text: "THE WORLD IS ON AIR" });
  }

  private pocketTitle(): string {
    if (this.pocketPage === "now") return this.t("正在播放");
    if (this.pocketPage === "stations") return this.t("电台列表");
    if (this.pocketPage === "channels") return this.t("频道");
    if (this.pocketPage === "search") return this.t("搜索电台");
    if (this.pocketPage === "favorites") return this.t("喜欢");
    if (this.pocketPage === "history") return this.t("最近");
    return this.t("乔木电台");
  }

  private renderPocketContent(content: HTMLElement): void {
    if (this.pocketPage === "menu") {
      const items: Array<{ page: PocketPage; label: string }> = [
        { page: "now", label: this.t("正在播放") },
        { page: "channels", label: this.t("频道") },
        { page: "stations", label: this.t("电台列表") },
        { page: "search", label: this.t("搜索电台") },
        { page: "favorites", label: this.t("喜欢") },
        { page: "history", label: this.t("最近") },
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
      now.createEl("h2", { text: station?.name ?? this.t("还没有播放电台") });
      now.createEl("p", { text: station ? stationRowContent(station, 0, false, resolveLocale(this.plugin.data.settings.language)).meta : this.t("从电台列表选择一家开始。") });
      if (station) {
        const liked = this.plugin.isLiked(station.id);
        const like = now.createEl("button", { attr: { "aria-pressed": String(liked) } });
        setIcon(like, "heart");
        like.createSpan({ text: liked ? this.t("已喜欢") : this.t("加入喜欢") });
        like.toggleClass("is-liked", liked);
        like.addEventListener("click", () => this.plugin.toggleLike(station));
      }
      return;
    }

    if (this.pocketPage === "channels") {
      const list = content.createDiv({ cls: "qiaomu-radio__ipod-options" });
      CHANNELS.forEach((channel) => {
        const button = list.createEl("button", { attr: { "aria-pressed": String(channel.id === this.channel) } });
        button.createSpan({ text: this.t(channel.label) });
        const icon = button.createSpan({ attr: { "aria-hidden": "true" } });
        setIcon(icon, channel.id === this.channel ? "check" : "chevron-right");
        button.addEventListener("click", () => {
          this.channel = channel.id;
          this.browseFilter = {};
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
      form.createEl("label", { cls: "qiaomu-radio__sr-only", text: this.t("搜索电台"), attr: { for: searchId } });
      const input = form.createEl("input", { type: "search", value: this.filterQuery, attr: { id: searchId, placeholder: this.t("电台名称或城市") } });
      const button = form.createEl("button", { type: "submit", text: this.t("搜索") });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        this.directoryQuery = input.value.trim().slice(0, 80);
        this.filterQuery = "";
        this.channel = "recommend";
        this.pocketPage = "stations";
        this.browseFilter = {};
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
      this.browseFilter = {};
      void this.loadStations();
      return;
    }
    this.render();
  }

  private renderPocketStations(results: HTMLElement): void {
    if (this.loading) {
      results.createEl("p", { cls: "qiaomu-radio__ipod-empty", text: this.t("正在寻找信号…") });
      return;
    }
    if (this.error) {
      const retry = results.createEl("button", { cls: "qiaomu-radio__ipod-empty", text: this.t("连接失败，点按重试") });
      retry.addEventListener("click", () => void this.loadStations());
      return;
    }
    const stations = this.visibleStations().slice(0, 60);
    if (stations.length === 0) {
      results.createEl("p", { cls: "qiaomu-radio__ipod-empty", text: this.channel === "favorites" ? this.t("还没有喜欢的电台") : this.channel === "history" ? this.t("还没有收听记录") : this.t("没有找到可用电台。") });
      return;
    }
    stations.forEach((station) => {
      const current = this.playerState.station?.id === station.id;
      const button = results.createEl("button", { cls: `qiaomu-radio__ipod-station${current ? " is-current" : ""}` });
      const copy = button.createSpan();
      copy.createEl("strong", { text: stationRowContent(station, 0, false).name });
      copy.createSpan({ text: stationRowContent(station, 0, false, resolveLocale(this.plugin.data.settings.language)).meta });
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
    volume.createEl("label", { cls: "qiaomu-radio__sr-only", text: this.t("音量"), attr: { for: volumeId } });
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
    this.addScreenReaderText(previous, this.t("上一家电台"));
    previous.disabled = !this.playerState.station;
    previous.addEventListener("click", () => void this.plugin.previous());
    const next = wheel.createEl("button", { cls: "qiaomu-radio__wheel-next" });
    setIcon(next, "skip-forward");
    this.addScreenReaderText(next, this.t("下一家电台"));
    next.disabled = !this.playerState.station && this.stations.length === 0;
    next.addEventListener("click", () => void this.plugin.next(true));
    const toggle = wheel.createEl("button", { cls: "qiaomu-radio__wheel-toggle" });
    setIcon(toggle, this.playerState.status === "playing" ? "pause" : "play");
    this.addScreenReaderText(toggle, this.playerState.status === "playing" ? this.t("暂停") : this.t("播放"));
    toggle.disabled = !this.playerState.station;
    toggle.addEventListener("click", () => this.plugin.player.toggle());
    const center = wheel.createEl("button", { cls: "qiaomu-radio__wheel-center" });
    this.addScreenReaderText(center, this.t("播放或暂停"));
    center.addEventListener("click", () => this.plugin.player.toggle());
  }

  private renderModeSwitch(device: HTMLElement): void {
    const modes = device.createDiv({ cls: "qiaomu-radio__modes" });
    RADIO_THEMES.forEach((theme) => {
      const selected = theme.id === this.plugin.data.settings.theme;
      const button = modes.createEl("button", { text: this.t(theme.label), attr: { "aria-pressed": String(selected) } });
      button.addEventListener("click", () => this.plugin.setTheme(theme.id));
    });
  }

  private renderPlayer(body: HTMLElement): void {
    const state = this.playerState;
    const station = state.station;
    const player = body.createEl("section", { cls: "qiaomu-radio__player" });
    const top = player.createDiv({ cls: "qiaomu-radio__player-top" });
    this.renderModeSwitch(top);
    const status = top.createDiv({ cls: "qiaomu-radio__status" });
    status.createSpan({ cls: `qiaomu-radio__status-dot is-${state.status}`, attr: { "aria-hidden": "true" } });
    status.createSpan({ cls: "qiaomu-radio__status-text", text: this.t(state.message) });
    const listening = player.createDiv({ cls: "qiaomu-radio__listening" });
    const now = listening.createDiv({ cls: "qiaomu-radio__now" });
    const artwork = now.createDiv({ cls: "qiaomu-radio__artwork", attr: { "aria-hidden": "true" } });
    const emblem = artwork.createSpan({ cls: "qiaomu-radio__artwork-emblem" });
    setIcon(emblem, "radio-tower");
    if (station?.favicon && /^https:\/\//i.test(station.favicon)) {
      const logo = artwork.createEl("img", { attr: { src: station.favicon, alt: "", referrerpolicy: "no-referrer" } });
      logo.addEventListener("load", () => { emblem.hidden = true; });
      logo.addEventListener("error", () => logo.remove());
    }
    now.createSpan({ cls: "qiaomu-radio__eyebrow", text: station ? `${displayName(station.countryCode, "region", resolveLocale(this.plugin.data.settings.language), station.country)} · ${station.codec || "LIVE"}` : "LIVE RADIO" });
    const title = now.createDiv({ cls: "qiaomu-radio__title-row" });
    title.createEl("h1", { text: station?.name ?? this.t("选一家电台") });
    if (station) {
      const liked = this.plugin.isLiked(station.id);
      const like = title.createEl("button", { cls: `qiaomu-radio__status-like${liked ? " is-liked" : ""}`, attr: { "aria-pressed": String(liked) } });
      setIcon(like, "heart");
      this.addScreenReaderText(like, liked ? this.t("取消喜欢") : this.t("喜欢"));
      like.addEventListener("click", () => {
        this.plugin.toggleLike(station);
        new Notice(liked ? this.t("已取消喜欢") : this.t("已加入喜欢"));
      });
    }

    now.createEl("p", { text: station ? station.tags.slice(0, 3).map(tag => this.t(genreLabel(tag))).join(" · ") || this.t("全球直播电台") : this.t("不用离开笔记，听见世界。") });

    this.renderTransport(listening);
  }

  private renderTransport(player: HTMLElement): void {
    const state = this.playerState;
    const transport = player.createDiv({ cls: "qiaomu-radio__transport" });
    const previous = transport.createEl("button");
    setIcon(previous, "skip-back");
    this.addScreenReaderText(previous, this.t("上一家电台"));
    previous.disabled = !state.station;
    previous.addEventListener("click", () => void this.plugin.previous());

    const toggle = transport.createEl("button", { cls: "qiaomu-radio__play" });
    setIcon(toggle, state.status === "playing" ? "pause" : "play");
    this.addScreenReaderText(toggle, state.status === "playing" ? this.t("暂停") : this.t("播放"));
    toggle.disabled = !state.station;
    toggle.addEventListener("click", () => this.plugin.player.toggle());

    const next = transport.createEl("button");
    setIcon(next, "skip-forward");
    this.addScreenReaderText(next, this.t("下一家电台"));
    next.disabled = !state.station && this.stations.length === 0;
    next.addEventListener("click", () => void this.plugin.next(true));

    const volume = transport.createDiv({ cls: "qiaomu-radio__volume" });
    const icon = volume.createSpan({ attr: { "aria-hidden": "true" } });
    setIcon(icon, state.volume === 0 ? "volume-x" : "volume-2");
    const volumeId = "qiaomu-radio-volume";
    volume.createEl("label", { cls: "qiaomu-radio__sr-only", text: this.t("音量"), attr: { for: volumeId } });
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
    form.createEl("label", { cls: "qiaomu-radio__sr-only", text: this.t("搜索电台"), attr: { for: searchId } });
    const input = form.createEl("input", { type: "search", value: this.filterQuery, attr: { id: searchId, "data-focus-key": "search", placeholder: this.t("筛选当前列表，回车搜索全球") } });
    const submit = form.createEl("button", { type: "submit", text: this.t("搜索全球") });

    const channels = directory.createEl("nav", { cls: "qiaomu-radio__channels" });
    const discovery = channels.createDiv({ cls: "qiaomu-radio__channel-group" });
    const library = channels.createDiv({ cls: "qiaomu-radio__channel-group qiaomu-radio__library" });
    CHANNELS.filter(channel => ["recommend", "focus", "unwind", "favorites", "history"].includes(channel.id)).forEach((channel) => {
      const selected = channel.id === this.channel && !this.directoryQuery && !Object.keys(this.browseFilter).length;
      const group = channel.id === "favorites" || channel.id === "history" ? library : discovery;
      const button = group.createEl("button", { attr: { "aria-pressed": String(selected) } });
      if (channel.icon) {
        const channelIcon = button.createSpan({ attr: { "aria-hidden": "true" } });
        setIcon(channelIcon, channel.icon);
      }
      button.createSpan({ text: this.t(channel.label) });
      button.addEventListener("click", () => {
        if (selected) return;
        this.channel = channel.id;
        this.browseFilter = {};
        this.browseOpen = false;
        this.filterQuery = "";
        this.directoryQuery = "";
        void this.loadStations();
      });
    });
    const browse = discovery.createEl("button", { cls: "qiaomu-radio__browse-trigger", attr: { "aria-expanded": String(this.browseOpen), "aria-haspopup": "dialog", "data-focus-key": "browse" } });
    const browseLabel = [this.browseFilter.tag ? this.t(genreLabel(this.browseFilter.tag)) : "", this.filterLabel("language", this.browseFilter.language), this.filterLabel("country", this.browseFilter.country)].filter(Boolean).join(" · ");
    browse.createSpan({ text: browseLabel || this.t("浏览") });
    setIcon(browse.createSpan({ attr: { "aria-hidden": "true" } }), "chevron-down");
    browse.setAttribute("aria-pressed", String(Object.keys(this.browseFilter).length > 0));
    browse.addEventListener("click", () => {
      this.browseOpen = !this.browseOpen;
      this.browseDraft = { ...this.browseFilter };
      this.render();
      this.containerEl.querySelector<HTMLElement>(".qiaomu-radio__browse-panel button")?.focus();
    });
    if (this.browseOpen) this.renderBrowse(directory);

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
      this.browseFilter = {};
      void this.loadStations();
    });
    submit.disabled = this.loading;
    syncSubmit();
    this.renderStationResults(results);
  }

  private renderStationResults(results: HTMLElement): void {
    results.empty();
    const visible = this.visibleStations();
    if (this.directoryQuery) {
      const heading = results.createDiv({ cls: "qiaomu-radio__results-heading" });
      heading.createEl("h2", { text: `“${this.directoryQuery}”` });
    }

    if (this.error) {
      const empty = results.createDiv({ cls: "qiaomu-radio__empty" });
      empty.createEl("p", { text: this.t(this.error) });
      const retry = empty.createEl("button", { text: this.t("重新连接") });
      retry.addEventListener("click", () => void this.loadStations());
      if (this.stations.length === 0) return;
    }
    if (this.loading && !this.stations.length) {
      results.createEl("p", { cls: "qiaomu-radio__empty", text: this.t("正在获取电台…"), attr: { role: "status" } });
      return;
    }
    if (this.notice) results.createEl("p", { cls: "qiaomu-radio__notice", text: this.t(this.notice) });
    if (visible.length === 0) {
      const text = this.filterQuery ? this.t("当前列表没有匹配项，按回车搜索全球目录。")
        : this.channel === "favorites" ? this.t("点亮红心的电台会留在这里。")
          : this.channel === "history" ? this.t("播放过的电台会按最近顺序出现。") : this.t("没有找到可用电台。");
      results.createEl("p", { cls: "qiaomu-radio__empty", text });
      return;
    }

    const list = results.createDiv({ cls: "qiaomu-radio__station-list" });
    visible.slice(0, 60).forEach((station, index) => this.renderStation(list, station, index));
  }

  private renderBrowse(directory: HTMLElement): void {
    const layer = directory.createDiv({ cls: "qiaomu-radio__browse-layer" });
    const panel = layer.createDiv({ cls: "qiaomu-radio__browse-panel", attr: { role: "dialog", "aria-modal": "true", "aria-labelledby": "qiaomu-browse-heading" } });
    const close = (): void => {
      this.browseOpen = false;
      this.render();
      this.containerEl.querySelector<HTMLElement>('[data-focus-key="browse"]')?.focus({ preventScroll: true });
    };
    layer.addEventListener("click", event => { if (event.target === layer) close(); });
    panel.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === "Tab") {
        const buttons = Array.from(panel.querySelectorAll<HTMLElement>("button, summary")).filter(element => element.getClientRects().length > 0);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        const active = panel.ownerDocument.activeElement;
        if (event.shiftKey && active === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && active === last) { event.preventDefault(); first?.focus(); }
      }
    });
    const head = panel.createDiv({ cls: "qiaomu-radio__browse-head" });
    head.createEl("h2", { text: this.t("浏览电台"), attr: { id: "qiaomu-browse-heading" } });
    const dismiss = head.createEl("button");
    setIcon(dismiss, "x");
    this.addScreenReaderText(dismiss, this.t("关闭分类"));
    dismiss.addEventListener("click", close);
    const apply = (): void => {
      this.browseFilter = { ...this.browseDraft };
      this.channel = "recommend";
      this.directoryQuery = "";
      this.filterQuery = "";
      this.browseOpen = false;
      void this.loadStations();
      this.containerEl.querySelector<HTMLElement>('[data-focus-key="browse"]')?.focus({ preventScroll: true });
    };
    const body = panel.createDiv({ cls: "qiaomu-radio__browse-body" });
    const group = (parent: HTMLElement, label: string, key: keyof DirectoryFilter, items: readonly (readonly [string, string])[]): void => {
      const section = parent.createEl("section");
      section.createEl("h3", { text: this.t(label) });
      const choices = section.createDiv({ cls: "qiaomu-radio__browse-choices" });
      for (const [value, text] of items) {
        const button = choices.createEl("button", { text: this.filterLabel(key, value) || this.t(text), attr: { "aria-pressed": String((this.browseDraft[key] || "") === value), "data-filter-key": key, "data-filter-value": value, "data-focus-key": `filter-${key}-${value}` } });
        button.addEventListener("click", () => {
          if (value) this.browseDraft[key] = value;
          else delete this.browseDraft[key];
          panel.querySelectorAll<HTMLElement>(`[data-filter-key="${key}"]`).forEach(element => element.setAttribute("aria-pressed", String(element.dataset.filterValue === value)));
          reset.disabled = Object.keys(this.browseDraft).length === 0;
        });
      }
    };
    for (const category of BROWSE_GROUPS) group(body, category.label, "tag", category.items);
    const advanced = body.createEl("details", { cls: "qiaomu-radio__browse-advanced" });
    advanced.open = !!(this.browseDraft.country || this.browseDraft.language);
    advanced.createEl("summary", { text: this.t("语言与地区") });
    group(advanced, this.t("语言"), "language", LANGUAGES);
    group(advanced, this.t("地区"), "country", REGIONS);
    const footer = panel.createDiv({ cls: "qiaomu-radio__browse-footer" });
    const reset = footer.createEl("button", { cls: "qiaomu-radio__browse-reset" });
    setIcon(reset.createSpan({ attr: { "aria-hidden": "true" } }), "rotate-ccw");
    reset.createSpan({ text: this.t("清除筛选") });
    reset.disabled = !Object.keys(this.browseDraft).length;
    reset.addEventListener("click", () => {
      this.browseDraft = {};
      panel.querySelectorAll<HTMLElement>("[data-filter-key]").forEach(element => element.setAttribute("aria-pressed", String(element.dataset.filterValue === "")));
      reset.disabled = true;
    });
    const show = footer.createEl("button", { text: this.t("查看电台"), cls: "qiaomu-radio__browse-apply" });
    show.addEventListener("click", apply);
  }

  private filterLabel(key: keyof DirectoryFilter, value?: string): string {
    if (!value) return "";
    if (key === "tag") return this.t(genreLabel(value));
    const locale = resolveLocale(this.plugin.data.settings.language);
    const languageCodes: Record<string, string> = { chinese: "zh", english: "en", japanese: "ja", french: "fr", german: "de", spanish: "es" };
    return displayName(key === "country" ? value : languageCodes[value] || value, key === "country" ? "region" : "language", locale, value);
  }

  private renderStation(list: HTMLElement, station: Station, index: number): void {
    const liked = this.plugin.isLiked(station.id);
    const rowContent = stationRowContent(station, index, liked, resolveLocale(this.plugin.data.settings.language));
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

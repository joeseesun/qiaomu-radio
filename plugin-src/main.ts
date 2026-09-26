import { Notice, Plugin, PluginSettingTab, Setting, type App, type WorkspaceLeaf } from "obsidian";
import { RadioPlayer } from "./player";
import { RadioService } from "./radio-service";
import { QiaomuRadioView, RADIO_VIEW_TYPE } from "./radio-view";
import { EMPTY_PROFILE, rankStations, recordPlay, recordSkip, setLiked } from "./taste";
import { normalizeTheme, RADIO_THEMES, type RadioThemeId } from "./themes";
import type { MoodId, RadioData, Station } from "./types";
import { resolveLocale, translate, UI_LANGUAGES, type LanguageSetting } from "./i18n";
import { createHomeProvider } from "./home";
import { notifyHomeChanged } from "./qiaomu-home";

const DEFAULT_DATA: RadioData = {
  settings: {
    defaultMood: "recommend",
    volume: 0.72,
    theme: "classic",
    language: "auto",
  },
  profile: EMPTY_PROFILE,
};

export default class QiaomuRadioPlugin extends Plugin {
  t(source: string): string { return translate(source, resolveLocale(this.data.settings.language)); }
  setLanguage(language: LanguageSetting): void {
    this.data.settings.language = language;
    void this.saveState();
    this.refreshViews();
  }
  data: RadioData = structuredClone(DEFAULT_DATA);
  readonly directory = new RadioService();
  player!: RadioPlayer;
  private queue: Station[] = [];
  private queueIndex = -1;
  private playGeneration = 0;
  private pendingStationId: string | null = null;
  /** Shows the live station and recent stations on Qiaomu Home; see qiaomu-home.ts. */
  qiaomuHome = createHomeProvider(this);

  async onload(): Promise<void> {
    await this.loadState();
    this.player = new RadioPlayer(this.data.settings.volume);
    let homeKey = "";
    this.register(this.player.watch((state) => {
      const key = `${state.station?.id ?? ""}|${state.status}`;
      if (key === homeKey) return;
      homeKey = key;
      notifyHomeChanged(this.app, this.manifest.id);
    }));
    this.registerView(RADIO_VIEW_TYPE, (leaf) => new QiaomuRadioView(leaf, this));
    this.addRibbonIcon("radio-tower", this.t("打开乔木电台"), () => void this.activateView());
    this.addCommand({ id: "open-radio", name: this.t("打开电台"), callback: () => void this.activateView() });
    this.addCommand({ id: "toggle-playback", name: this.t("播放或暂停"), checkCallback: (checking) => {
      if (!this.player.snapshot().station) return false;
      if (!checking) this.player.toggle();
      return true;
    } });
    this.addSettingTab(new RadioSettingTab(this.app, this));
  }

  onunload(): void {
    this.playGeneration++;
    this.player.destroy();
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(RADIO_VIEW_TYPE)[0];
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    if (!existing) await leaf.setViewState({ type: RADIO_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  rank(stations: Station[]): Station[] {
    return rankStations(stations, this.data.profile);
  }

  isLiked(stationId: string): boolean {
    return this.data.profile.likedStationIds.includes(stationId);
  }

  async playStation(station: Station, queue: Station[]): Promise<void> {
    const current = this.player.snapshot();
    if (this.pendingStationId === station.id || (current.station?.id === station.id &&
      (current.status === "loading" || current.status === "playing"))) return;
    const generation = ++this.playGeneration;
    this.pendingStationId = station.id;
    this.player.stop();
    this.queue = queue;
    this.queueIndex = Math.max(0, queue.findIndex((item) => item.id === station.id));
    try {
      this.data.profile = recordPlay(this.data.profile, station);
      await this.saveState();
      if (generation !== this.playGeneration) return;
      this.refreshViews();
      const url = await this.directory.streamUrl(station);
      if (generation !== this.playGeneration) return;
      this.pendingStationId = null;
      await this.player.play(station, url);
    } catch {
      if (generation === this.playGeneration) new Notice(this.t("这家电台暂时无法播放。"));
    } finally {
      if (generation === this.playGeneration) this.pendingStationId = null;
    }
  }

  async next(explicitSkip = false): Promise<void> {
    const current = this.player.snapshot().station;
    if (explicitSkip && current) {
      this.data.profile = recordSkip(this.data.profile, current);
      await this.saveState();
      this.refreshViews();
    }
    if (this.queue.length === 0) return;
    this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    const station = this.queue[this.queueIndex];
    if (station) await this.playStation(station, this.queue);
  }

  async previous(): Promise<void> {
    if (this.queue.length === 0) return;
    this.queueIndex = (this.queueIndex - 1 + this.queue.length) % this.queue.length;
    const station = this.queue[this.queueIndex];
    if (station) await this.playStation(station, this.queue);
  }

  toggleLike(station: Station): void {
    this.data.profile = setLiked(this.data.profile, station, !this.isLiked(station.id));
    void this.saveState();
    this.refreshViews();
  }

  setVolume(volume: number, persist = true): void {
    this.data.settings.volume = Math.max(0, Math.min(1, volume));
    this.player.setVolume(this.data.settings.volume);
    if (persist) void this.saveState();
  }

  setTheme(theme: RadioThemeId): void {
    this.data.settings.theme = normalizeTheme(theme);
    void this.saveState();
    this.refreshViews();
  }

  private refreshViews(): void {
    this.app.workspace.getLeavesOfType(RADIO_VIEW_TYPE).forEach((leaf: WorkspaceLeaf) => {
      const view = leaf.view;
      if (view.getViewType() === RADIO_VIEW_TYPE) (view as QiaomuRadioView).refreshProfile();
    });
  }

  private async loadState(): Promise<void> {
    const saved = await this.loadData() as Partial<RadioData> | null;
    this.data = {
      settings: { ...DEFAULT_DATA.settings, ...(saved?.settings ?? {}) },
      profile: { ...EMPTY_PROFILE, ...(saved?.profile ?? {}) },
    };
    this.data.settings.theme = normalizeTheme(this.data.settings.theme);
  }

  private async saveState(): Promise<void> {
    await this.saveData(this.data);
  }
}

class RadioSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: QiaomuRadioPlugin) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    const t = (source: string): string => this.plugin.t(source);
    this.containerEl.dir = resolveLocale(this.plugin.data.settings.language) === "ar" ? "rtl" : "ltr";
    new Setting(this.containerEl).setName(t("界面语言"))
      .addDropdown(dropdown => dropdown.addOptions({ ...UI_LANGUAGES, auto: t("跟随系统") })
        .setValue(this.plugin.data.settings.language ?? "auto")
        .onChange(value => { this.plugin.setLanguage(value as LanguageSetting); this.display(); }));
    new Setting(this.containerEl).setName(t("乔木电台")).setHeading();
    new Setting(this.containerEl)
      .setName(t("默认频道"))
      .setDesc(t("每次新开电台页时首先显示的频道。"))
      .addDropdown((dropdown) => dropdown
        .addOptions({
          recommend: t("推荐"),
          focus: t("专注"),
          unwind: t("松弛"),
          jazz: t("爵士"),
          classical: t("古典"),
          energy: t("能量"),
          world: t("世界"),
        })
        .setValue(this.plugin.data.settings.defaultMood)
        .onChange(async (value) => {
          this.plugin.data.settings.defaultMood = value as MoodId;
          await this.plugin.saveData(this.plugin.data);
        }));
    new Setting(this.containerEl)
      .setName(t("默认播放器"))
      .setDesc(t("播放器主题会保存在当前 Vault。"))
      .addDropdown((dropdown) => dropdown
        .addOptions(Object.fromEntries(RADIO_THEMES.map((theme) => [theme.id, t(theme.label)])))
        .setValue(this.plugin.data.settings.theme)
        .onChange((value) => this.plugin.setTheme(value as RadioThemeId)));
    new Setting(this.containerEl)
      .setName(t("默认音量"))
      .setDesc(t("音量调整会立即保存。"))
      .addSlider((slider) => slider
        .setLimits(0, 100, 1)
        .setValue(Math.round(this.plugin.data.settings.volume * 100))
        .onChange((value) => this.plugin.setVolume(value / 100)));

    new Setting(this.containerEl).setName(t("关于")).setHeading();
    const about = this.containerEl.createDiv({ cls: "qiaomu-radio-settings__about" });
    about.createEl("p", { text: `${t("版本")} ${this.plugin.manifest.version} · ${t("电台目录来自 Radio Browser，播放偏好只保存在当前 Vault 的插件数据中。")}` });
    const links = about.createDiv({ cls: "qiaomu-radio-settings__links" });
    links.createEl("a", { text: "GitHub issues", href: "https://github.com/joeseesun/qiaomu-radio/issues" });
    links.createEl("a", { text: t("在线电台"), href: "https://radio.qiaomu.ai/" });
    links.createEl("a", { text: "向阳乔木", href: "https://x.com/vista8" });
  }
}

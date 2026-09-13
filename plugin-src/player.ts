import Hls from "hls.js";
import type { PlayerState, Station } from "./types";

type StateListener = (state: PlayerState) => void;

export class RadioPlayer {
  private readonly audio: HTMLAudioElement;
  private hls: Hls | null = null;
  private listener: StateListener | null = null;
  private state: PlayerState;

  constructor(volume: number, private readonly onFailure: () => void) {
    this.audio = new Audio();
    this.audio.preload = "none";
    this.audio.volume = volume;
    this.state = { station: null, status: "idle", message: "选择一家电台开始收听", volume };
    this.audio.addEventListener("playing", this.handlePlaying);
    this.audio.addEventListener("pause", this.handlePause);
    this.audio.addEventListener("error", this.handleError);
  }

  subscribe(listener: StateListener): () => void {
    this.listener = listener;
    listener(this.state);
    return () => {
      if (this.listener === listener) this.listener = null;
    };
  }

  snapshot(): PlayerState {
    return this.state;
  }

  async play(station: Station, url: string): Promise<void> {
    this.destroyHls();
    this.update({ station, status: "loading", message: "正在连接直播…" });
    if (/\.m3u8(?:$|\?)/i.test(url) && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 45,
        manifestLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 4,
      });
      this.hls = hls;
      hls.attachMedia(this.audio);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
      hls.on(Hls.Events.MANIFEST_PARSED, () => void this.startPlayback());
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) this.fail();
      });
      return;
    }
    this.audio.src = url;
    await this.startPlayback();
  }

  toggle(): void {
    if (!this.state.station) return;
    if (this.audio.paused) void this.startPlayback();
    else this.audio.pause();
  }

  setVolume(volume: number): void {
    const next = Math.max(0, Math.min(1, volume));
    this.audio.volume = next;
    this.update({ volume: next });
  }

  stop(): void {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.destroyHls();
    this.update({ station: null, status: "idle", message: "选择一家电台开始收听" });
  }

  destroy(): void {
    this.stop();
    this.audio.removeEventListener("playing", this.handlePlaying);
    this.audio.removeEventListener("pause", this.handlePause);
    this.audio.removeEventListener("error", this.handleError);
    this.listener = null;
  }

  private async startPlayback(): Promise<void> {
    try {
      await this.audio.play();
    } catch (error) {
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "请点击播放按钮开始收听。"
        : "这家电台暂时无法播放。";
      this.update({ status: "error", message });
      if (!(error instanceof DOMException && error.name === "NotAllowedError")) this.onFailure();
    }
  }

  private fail(): void {
    this.update({ status: "error", message: "直播中断，正在尝试下一家。" });
    this.onFailure();
  }

  private readonly handlePlaying = (): void => {
    this.update({ status: "playing", message: "正在直播" });
  };

  private readonly handlePause = (): void => {
    if (this.state.station && this.state.status !== "error") this.update({ status: "paused", message: "已暂停" });
  };

  private readonly handleError = (): void => this.fail();

  private update(patch: Partial<PlayerState>): void {
    this.state = { ...this.state, ...patch };
    this.listener?.(this.state);
  }

  private destroyHls(): void {
    this.hls?.destroy();
    this.hls = null;
  }
}

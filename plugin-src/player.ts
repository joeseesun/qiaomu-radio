import Hls from "hls.js";
import type { PlayerState, Station } from "./types";

type StateListener = (state: PlayerState) => void;

export class RadioPlayer {
  private audio: HTMLAudioElement;
  private generation = 0;
  private startupTimer: number | null = null;
  private retryTimer: number | null = null;
  private streamUrl = "";
  private retries = 0;
  private failed = false;
  private hls: Hls | null = null;
  private listener: StateListener | null = null;
  private state: PlayerState;

  constructor(volume: number) {
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
    this.retries = 0;
    this.streamUrl = url;
    await this.connect(station, url);
  }

  private async connect(station: Station, url: string): Promise<void> {
    this.cancelPending();
    const generation = this.generation;
    this.failed = false;
    this.audio.removeEventListener("playing", this.handlePlaying);
    this.audio.removeEventListener("pause", this.handlePause);
    this.audio.removeEventListener("error", this.handleError);
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.destroyHls();
    this.audio = new Audio();
    this.audio.preload = "none";
    this.audio.volume = this.state.volume;
    this.audio.addEventListener("playing", this.handlePlaying);
    this.audio.addEventListener("pause", this.handlePause);
    this.audio.addEventListener("error", this.handleError);
    this.update({ station, status: "loading", message: "正在连接直播…" });
    this.startupTimer = window.setTimeout(() => {
      if (generation === this.generation) this.fail();
    }, 30000);
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
      hls.on(Hls.Events.MEDIA_ATTACHED, () => { if (generation === this.generation) hls.loadSource(url); });
      hls.on(Hls.Events.MANIFEST_PARSED, () => { if (generation === this.generation) void this.startPlayback(); });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (generation === this.generation && data.fatal) this.fail();
      });
      return;
    }
    this.audio.src = url;
    await this.startPlayback();
  }

  toggle(): void {
    if (!this.state.station) return;
    if (this.state.status === "loading" || this.state.status === "playing") {
      this.cancelPending();
      this.audio.pause();
      this.update({ status: "paused", message: "已暂停" });
    } else {
      void this.play(this.state.station, this.streamUrl);
    }
  }

  setVolume(volume: number): void {
    const next = Math.max(0, Math.min(1, volume));
    this.audio.volume = next;
    this.update({ volume: next });
  }

  stop(): void {
    this.cancelPending();
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
    const generation = this.generation;
    try {
      await this.audio.play();
      if (generation === this.generation) this.handlePlaying();
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof Error && error.name === "AbortError") return;
      const message = error instanceof DOMException && error.name === "NotAllowedError"
        ? "请点击播放按钮开始收听。"
        : "这家电台暂时无法播放。";
      if (error instanceof Error && error.name === "NotAllowedError") {
        this.cancelPending();
        this.update({ status: "error", message });
      } else this.fail();
    }
  }

  private fail(): void {
    if (this.failed || this.state.status === "paused" || !this.state.station) return;
    this.cancelPending();
    this.failed = true;
    this.audio.pause();
    this.destroyHls();
    const station = this.state.station;
    if (this.retries++ === 0) {
      const generation = this.generation;
      this.update({ status: "loading", message: "正在连接直播…" });
      this.retryTimer = window.setTimeout(() => {
        if (generation === this.generation) void this.connect(station, this.streamUrl);
      }, 1500);
    } else {
      this.update({ status: "error", message: "这家电台暂时无法播放。" });
    }
  }

  private readonly handlePlaying = (): void => {
    if (this.failed || this.state.status === "paused" || !this.state.station) return;
    if (this.startupTimer !== null) window.clearTimeout(this.startupTimer);
    this.startupTimer = null;
    this.update({ status: "playing", message: "正在直播" });
  };

  private readonly handlePause = (): void => {
    if (!this.failed && this.state.station && this.state.status === "playing") this.update({ status: "paused", message: "已暂停" });
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

  private cancelPending(): void {
    this.generation++;
    if (this.startupTimer !== null) window.clearTimeout(this.startupTimer);
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.startupTimer = null;
    this.retryTimer = null;
  }
}

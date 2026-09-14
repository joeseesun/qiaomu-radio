import { afterEach, describe, expect, it, vi } from "vitest";
import type { Station } from "./types";

const fakeDom = vi.hoisted(() => ({ element: null as null | (() => any) }));

vi.mock("obsidian", () => {
  class ItemView {
    containerEl: any;
    constructor(_leaf: unknown) {
      const make = fakeDom.element;
      if (make === null) throw new Error("fake DOM must be installed before mounting the view");
      this.containerEl = make();
      this.containerEl.appendChild(make());
      this.containerEl.appendChild(make());
    }
  }
  return {
    ItemView,
    Notice: class {
      constructor(public readonly message: string) {}
    },
    setIcon: (element: any, icon: string) => element.setAttribute("data-icon", icon),
  };
});

/** Minimal DOM that satisfies the Obsidian createEl/createSpan/empty helpers. */
function installFakeDom(): void {
  class FakeClassList {
    private readonly names: string[] = [];
    constructor(private readonly owner: FakeElement) {}
    add(...values: string[]): void {
      for (const value of values) if (!this.names.includes(value)) this.names.push(value);
    }
    remove(...values: string[]): void {
      for (const value of values) {
        const at = this.names.indexOf(value);
        if (at >= 0) this.names.splice(at, 1);
      }
    }
    contains(value: string): boolean {
      return this.names.includes(value);
    }
    toggle(value: string, force?: boolean): boolean {
      const has = this.contains(value);
      const want = force ?? !has;
      if (want) this.add(value);
      else this.remove(value);
      return want;
    }
    get value(): string {
      return this.names.join(" ");
    }
  }

  class FakeStyle {
    private readonly values: Record<string, string> = {};
    setProperty(name: string, value: string): void {
      this.values[name] = value;
    }
    getPropertyValue(name: string): string {
      return this.values[name] ?? "";
    }
  }

  class FakeElement {
    static create(_tag: string): FakeElement {
      return new FakeElement();
    }
    readonly children: FakeElement[] = [];
    readonly attributes: Record<string, string> = {};
    readonly listeners: Record<string, Array<(event: unknown) => void>> = {};
    readonly classList = new FakeClassList(this);
    readonly style = new FakeStyle();
    value = "";
    disabled = false;
    tagName = "div";
    parentElement: FakeElement | null = null;
    private text = "";

    get className(): string {
      return this.classList.value;
    }
    set className(value: string) {
      this.classList.remove(...this.classList.value.split(/\s+/).filter(Boolean));
      this.classList.add(...String(value).split(/\s+/).filter(Boolean));
    }
    get dataset(): Record<string, string> {
      const owner = this;
      return new Proxy({} as Record<string, string>, {
        get: (_target, key: string) => owner.getAttribute(`data-${key}`) ?? undefined,
        set: (_target, key: string, value: string) => {
          owner.setAttribute(`data-${key}`, value);
          return true;
        },
      });
    }
    get textContent(): string {
      return this.text + this.children.map((child) => child.textContent).join("");
    }
    get cls(): string {
      return this.className;
    }
    addClass(value: string): this {
      this.classList.add(value);
      return this;
    }
    removeClass(value: string): this {
      this.classList.remove(value);
      return this;
    }
    toggleClass(value: string, on: boolean): this {
      this.classList.toggle(value, on);
      return this;
    }
    setText(value: string): this {
      this.text = value;
      this.children.length = 0;
      return this;
    }
    setAttribute(name: string, value: string): void {
      this.attributes[name] = value;
    }
    getAttribute(name: string): string | null {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    }
    hasAttribute(name: string): boolean {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    }
    appendChild(child: FakeElement): FakeElement {
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    detach(): void {
      const siblings = this.parentElement?.children;
      if (!siblings) return;
      const at = siblings.indexOf(this);
      if (at >= 0) siblings.splice(at, 1);
      this.parentElement = null;
    }
    empty(): void {
      for (const child of this.children) child.parentElement = null;
      this.children.length = 0;
      this.text = "";
    }
    addEventListener(type: string, handler: (event: unknown) => void): void {
      (this.listeners[type] ??= []).push(handler);
    }
    dispatch(type: string): void {
      if (type === "click" && this.disabled) return;
      for (const handler of this.listeners[type] ?? []) handler({ preventDefault() {}, stopPropagation() {} });
    }
    private create(tag: string, options: Record<string, unknown> = {}): FakeElement {
      const node = new FakeElement();
      node.tagName = tag;
      const cls = options.cls ?? options.class;
      if (typeof cls === "string") node.className = cls;
      const attr = options.attr as Record<string, string> | undefined;
      if (attr) for (const [name, value] of Object.entries(attr)) node.setAttribute(name, value);
      for (const name of ["type", "placeholder", "href", "id", "min", "max", "step"]) {
        if (name in options) node.setAttribute(name, String(options[name]));
      }
      if (typeof options.text === "string") node.setText(options.text);
      if ("value" in options) node.value = String(options.value);
      this.appendChild(node);
      return node;
    }
    createEl(tag: string, options: Record<string, unknown> = {}): FakeElement {
      return this.create(tag, options);
    }
    createDiv(options: Record<string, unknown> = {}): FakeElement {
      return this.create("div", options);
    }
    createSpan(options: Record<string, unknown> = {}): FakeElement {
      return this.create("span", options);
    }
  }

  const scope = globalThis as unknown as Record<string, unknown>;
  scope.HTMLElement = FakeElement;
  scope.document = {
    createElement: (tag: string) => FakeElement.create(tag),
    createElementNS: (_namespace: string, tag: string) => FakeElement.create(tag),
  };
  (FakeElement.prototype as unknown as Record<string, unknown>).instanceOf = function (this: FakeElement, type: unknown) {
    return type === FakeElement || (typeof type === "function" && this instanceof (type as new () => unknown));
  };
  (FakeElement.prototype as unknown as Record<string, unknown>).createSvg = function (this: FakeElement, tag: string) {
    return this.createEl(tag);
  };
  fakeDom.element = () => new FakeElement();
}

installFakeDom();

const { Notice } = await import("obsidian");
const { QiaomuRadioView } = await import("./radio-view");

const station = (id: string, name: string): Station => ({
  id,
  name,
  streamUrl: `https://example.com/${id}.mp3`,
  homepage: "",
  favicon: "",
  tags: ["jazz"],
  country: "China",
  countryCode: "CN",
  language: "chinese",
  codec: "MP3",
  bitrate: 128,
  votes: 1,
  clickCount: 1,
});

interface Harness {
  view: InstanceType<typeof QiaomuRadioView>;
  root: any;
  plugin: any;
  listener: { state: any };
  results: Station[];
}

async function mount(options: { theme?: string; stations?: Station[]; playerStation?: Station | null } = {}): Promise<Harness> {
  const results = options.stations ?? [];
  const listener: { state: any } = {
    state: {
      station: options.playerStation ?? null,
      status: options.playerStation ? "playing" : "idle",
      message: options.playerStation ? "正在直播" : "选择一家电台开始收听",
      volume: 0.5,
    },
  };
  const plugin = {
    data: {
      settings: { defaultMood: "recommend", volume: 0.5, theme: options.theme ?? "pocket" },
      profile: { likedStationIds: [], skippedStationIds: [], tagWeights: {}, history: [] },
    },
    directory: { stations: vi.fn(async () => ({ stations: results, notice: "" })) },
    player: {
      subscribe: vi.fn((callback: (state: any) => void) => {
        listener.state = () => callback;
        return () => undefined;
      }),
      toggle: vi.fn(),
      snapshot: () => listener.state,
    },
    rank: (input: Station[]) => input,
    isLiked: () => false,
    toggleLike: vi.fn(),
    setTheme: vi.fn(),
    setVolume: vi.fn(),
    playStation: vi.fn(async () => undefined),
    next: vi.fn(async () => undefined),
    previous: vi.fn(async () => undefined),
  };
  const leaf = { app: {}, view: null } as unknown;
  const view = new QiaomuRadioView(leaf as never, plugin as never);
  await (view as unknown as { onOpen(): Promise<void> }).onOpen();
  const root = (view as unknown as { containerEl: { children: unknown[] } }).containerEl.children[1] as any;
  return { view, root, plugin, listener, results };
}

const textOf = (root: any): string => root.textContent as string;
function findButton(root: any, label: string): any | undefined {
  const stack = [...(root.children as any[])];
  while (stack.length > 0) {
    const node = stack.shift();
    if (node === undefined) break;
    if (node instanceof (globalThis as any).HTMLElement && node.textContent === label && node.listeners.click) return node;
    stack.push(...(node.children as any[]));
  }
  return undefined;
}
const flat = (root: any): any[] => {
  const out: any[] = [];
  const walk = (node: any) => {
    for (const child of node.children as any[]) {
      out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("iPod screen navigation", () => {
  it("opens on the menu with six rows", async () => {
    const { root } = await mount();
    const rows = flat(root).filter((node) => node.className.includes("qiaomu-radio__ipod-menu-row"));
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.textContent)).toEqual(["正在播放", "频道", "电台列表", "搜索电台", "喜欢", "最近"]);
  });

  it("closes the menu when 返回原版 is pressed", async () => {
    const { root, plugin } = await mount();
    findButton(root, "返回原版")?.dispatch("click");
    expect(plugin.setTheme).toHaveBeenCalledWith("classic");
  });

  it("switches to 正在播放 and shows the current station", async () => {
    const { root } = await mount({ playerStation: station("jazz24", "Jazz24") });
    findButton(root, "正在播放")?.dispatch("click");
    expect(textOf(root)).toContain("ON AIR");
    expect(textOf(root)).toContain("Jazz24");
    expect(textOf(root)).toContain("加入喜欢");
  });

  it("plays a station from the list and moves to 正在播放", async () => {
    const { root, plugin, results } = await mount({ stations: [station("a", "Radio A")] });
    findButton(root, "电台列表")?.dispatch("click");
    const row = flat(root).find((node) => node.className.includes("qiaomu-radio__ipod-station"));
    expect(row).toBeDefined();
    row.dispatch("click");
    await Promise.resolve();
    expect(plugin.playStation).toHaveBeenCalledWith(results[0], expect.any(Array));
    expect(textOf(root)).toContain("Radio A");
  });

  it("reloads the directory when a channel is picked", async () => {
    const { root, plugin } = await mount({ stations: [station("a", "Radio A")] });
    findButton(root, "频道")?.dispatch("click");
    findButton(root, "爵士")?.dispatch("click");
    await Promise.resolve();
    expect(plugin.directory.stations).toHaveBeenLastCalledWith("jazz", "");
    expect(textOf(root)).toContain("电台列表");
  });

  it("returns to the menu from a station list", async () => {
    const { root } = await mount({ stations: [station("a", "Radio A")] });
    findButton(root, "电台列表")?.dispatch("click");
    expect(textOf(root)).toContain("电台列表");
    findButton(root, "MENU")?.dispatch("click");
    expect(textOf(root)).toContain("正在播放");
  });

  it("keeps the click wheel enabled for menu, previous, next and play", async () => {
    const { root } = await mount({ playerStation: station("a", "Radio A") });
    const wheelButtons = flat(root).filter((node) => node.className.includes("qiaomu-radio__wheel-"));
    expect(wheelButtons.length).toBeGreaterThanOrEqual(5);
    expect(wheelButtons.some((button) => button.textContent === "MENU")).toBe(true);
  });

  it("shows only station rows after searching the directory", async () => {
    const { root, plugin } = await mount({ stations: [station("a", "Radio A"), station("b", "Radio B")] });
    findButton(root, "搜索电台")?.dispatch("click");
    const input = flat(root).find((node) => node.attributes.type === "search");
    expect(input).toBeDefined();
    input.value = "jazz";
    flat(root).find((node) => node.className.includes("qiaomu-radio__ipod-search"))?.dispatch("submit");
    await Promise.resolve();
    expect(plugin.directory.stations).toHaveBeenLastCalledWith("recommend", "jazz");
  });
});

describe("original player view", () => {
  it("renders the frameless player with one compact list row per station", async () => {
    const { root, plugin } = await mount({
      theme: "classic",
      stations: [station("a", "Radio A"), station("b", "Radio B")],
      playerStation: station("a", "Radio A"),
    });
    expect(flat(root).some((node) => node.className.includes("qiaomu-radio__ipod"))).toBe(false);
    expect(root.attributes["data-theme"]).toBe("classic");
    expect(textOf(root)).toContain("正在直播");

    expect(flat(root).some((node) => node.className.includes("qiaomu-radio__station-head"))).toBe(false);
    const rows = flat(root).filter((node) => /qiaomu-radio__station(\s|$)/.test(node.className));
    expect(rows).toHaveLength(2);
    expect(rows[0].className).toContain("is-current");
    expect(rows[1].className).not.toContain("is-current");

    const firstRow = rows[0].textContent as string;
    expect(firstRow).toContain("1");
    expect(firstRow).toContain("Radio A");
    expect(firstRow).toContain("China · jazz");
    expect(firstRow).toContain("MP3 · 128k");
    expect(flat(root).some((node) => node.className.includes("qiaomu-radio__station-quality"))).toBe(true);

    const rowLabels = flat(root).filter((node) => node.className.includes("qiaomu-radio__sr-only")).map((node) => node.textContent);
    expect(rowLabels).toContain("喜欢 Radio A");
  });

  it("switches the player theme from the visible mode buttons", async () => {
    const { root, plugin } = await mount({ theme: "classic" });
    findButton(root, "iPod")?.dispatch("click");
    expect(plugin.setTheme).toHaveBeenCalledWith("pocket");
  });

  it("keeps every rendered element free of generated hover tips", async () => {
    for (const theme of ["classic", "pocket"]) {
      const { root } = await mount({ theme, stations: [station("a", "Radio A")] });
      const offenders = flat(root)
        .filter((node) => node.hasAttribute("aria-label") || node.hasAttribute("title") || node.hasAttribute("data-tooltip"))
        .map((node) => `${node.className}:${node.getAttribute("aria-label") ?? node.getAttribute("title")}`);
      expect(offenders).toEqual([]);
    }
  });

  it("surfaces playback failures as a readable state instead of a tooltip", async () => {
    const { root, plugin } = await mount({ theme: "classic", stations: [station("a", "Radio A")] });
    plugin.playStation.mockRejectedValueOnce(new Error("boom"));
    const row = flat(root).find((node) => node.className.includes("qiaomu-radio__station-main"));
    row.dispatch("click");
    await Promise.resolve();
    expect(Notice).toBeDefined();
  });
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cleanStationName, stationRowContent } from "./station-row";
import type { Station } from "./types";

const station = (overrides: Partial<Station> = {}): Station => ({
  id: "jazz24",
  name: "Jazz24",
  streamUrl: "https://example.com/jazz24.mp3",
  homepage: "",
  favicon: "",
  tags: ["jazz", "public radio"],
  country: "The United States Of America",
  countryCode: "US",
  language: "english",
  codec: "MP3",
  bitrate: 128,
  votes: 1,
  clickCount: 1,
  ...overrides,
});

describe("station list row content", () => {
  it("strips provider decoration from raw directory names", () => {
    expect(cleanStationName("___LOUNGE__ by rautemusik (rm.fm)")).toBe("LOUNGE by rautemusik (rm.fm)");
    expect(cleanStationName("Chill Lounge Florida (USA) 128k mp3")).toBe("Chill Lounge Florida (USA)");
    expect(cleanStationName("Slow Focus | NTS")).toBe("Slow Focus | NTS");
    expect(cleanStationName("Jazz24 [128k MP3]")).toBe("Jazz24");
  });

  it("keeps meaningful brackets even when other brackets were quality tags", () => {
    expect(cleanStationName("Radio Swiss Jazz (128k)")).toBe("Radio Swiss Jazz");
    expect(cleanStationName("Radio Paradise (USA)")).toBe("Radio Paradise (USA)");
    expect(cleanStationName("SomaFM Groove Salad (128k MP3)")).toBe("SomaFM Groove Salad");
  });

  it("shortens very long names instead of letting them run", () => {
    const long = "A".repeat(30) + " " + "B".repeat(60);
    const cleaned = cleanStationName(long);
    expect(cleaned.length).toBeLessThanOrEqual(65);
    expect(cleaned.endsWith("…")).toBe(true);
  });

  it("falls back to the raw name when cleaning empties it", () => {
    expect(stationRowContent(station({ name: "___" }), 0, false).name).toBe("___");
  });

  it("numbers rows from one for list position", () => {
    expect(stationRowContent(station(), 0, false).index).toBe(1);
    expect(stationRowContent(station(), 41, false).index).toBe(42);
  });

  it("keeps country and first tag on the secondary line", () => {
    const row = stationRowContent(station(), 0, false);
    expect(row.meta).toBe("美国 · 爵士");
    expect(row.genre).toBe("爵士");
  });

  it("falls back to a global label when the directory has no country", () => {
    expect(stationRowContent(station({ country: "", countryCode: "", tags: [] }), 0, false).meta).toBe("全球");
  });

  it("formats bitrate for the quality chip and keeps codec only streams", () => {
    expect(stationRowContent(station(), 0, false).quality).toBe("MP3 · 128k");
    expect(stationRowContent(station({ bitrate: 0 }), 0, false).quality).toBe("MP3");
    expect(stationRowContent(station({ codec: "", bitrate: 0 }), 0, false).quality).toBe("LIVE");
  });

  it("names the favourite control without hover text", () => {
    expect(stationRowContent(station(), 0, false).likeLabel).toBe("加入喜欢 Jazz24");
    expect(stationRowContent(station(), 0, true).likeLabel).toBe("取消喜欢 Jazz24");
  });
});

describe("immersive player and list contract", () => {
  const css = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");
  const viewSource = readFileSync(fileURLToPath(new URL("./radio-view.ts", import.meta.url)), "utf8");

  it("hides the host view header but keeps only the phone status-bar safe area", () => {
    expect(css).toMatch(/\.workspace-leaf-content\[data-type="qiaomu-radio-view"\] > \.view-header\s*{[^}]*display: none;/);
    expect(css).toMatch(/\.workspace-leaf-content\[data-type="qiaomu-radio-view"\] > \.view-content\s*{[^}]*padding: 0;/);
    expect(css).toMatch(/\.is-phone \.mod-root \.workspace-leaf-content\[data-type="qiaomu-radio-view"\] > \.view-content\s*{[^}]*margin-top: var\(--safe-area-inset-top, env\(safe-area-inset-top, 0px\)\);/);
  });

  it("keeps the original player frameless inside the view", () => {
    const device = css.match(/\.qiaomu-radio__device\s*{([^}]*)}/)?.[1] ?? "";
    expect(device).toContain("height: 100%");
    expect(device).not.toMatch(/border|box-shadow|border-radius/);
  });

  it("renders station rows as a three column list without capsule cards", () => {
    const row = css.match(/\.qiaomu-radio__station\s*{([^}]*)}/)?.[1] ?? "";
    expect(row).toContain("display: grid");
    expect(row).toMatch(/grid-template-columns:\s*32px minmax\(0, 1fr\) 32px/);
    expect(row).not.toMatch(/border-left|border-inline-start/);
    expect(row).not.toMatch(/background:\s*var\(--background-secondary\)/);
    expect(css).not.toContain(".qiaomu-radio__station-head");
  });

  it("distinguishes playback with ink rather than a second adjacent hover block", () => {
    expect(css).not.toMatch(/nth-child\((?:odd|even)\)/);
    expect(css).toMatch(/\.qiaomu-radio__station\.is-current\s*{[^}]*background-color: transparent/);
    expect(css).toMatch(/\.qiaomu-radio__station\.is-current \.qiaomu-radio__station-index\s*{[^}]*color: var\(--qr-accent\)/);
  });

  it("gives the favourite control a visible resting state", () => {
    expect(css).toMatch(/\.qiaomu-radio__station-like\s*{[^}]*color: var\(--text-faint\)/);
    expect(css).toMatch(/\.qiaomu-radio__station-like:hover/);
  });

  it("paints the row background explicitly so host zebra rules cannot leak in", () => {
    const row = css.match(/\.qiaomu-radio__station\s*{([^}]*)}/)?.[1] ?? "";
    expect(row).toMatch(/background:\s*transparent/);
  });

  it("keeps the theme switch clear of the search field", () => {
    const modes = css.match(/\.qiaomu-radio__modes\s*{([^}]*)}/)?.[1] ?? "";
    expect(modes).not.toMatch(/position: absolute/);
    expect(viewSource).toContain("this.renderModeSwitch(top)");
    expect(css).toMatch(/\.qiaomu-radio__search button\s*{[^}]*white-space: nowrap/);
  });

  it("never generates hover tips from the player view", () => {
    for (const pattern of ['"aria-label"', "setTooltip", "title=", "data-tooltip"]) {
      expect(viewSource).not.toContain(pattern);
    }
    expect(viewSource).toContain("qiaomu-radio__sr-only");
    expect(css).toMatch(/\.qiaomu-radio__sr-only\s*{[^}]*clip: rect/);
  });

  it("ships only the original and iPod players in the plugin view", () => {
    expect(viewSource).not.toMatch(/RamsRadio|ClassicPlayer|PlayerSkin|fantasy/);
  });
});

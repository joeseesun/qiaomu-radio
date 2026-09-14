import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { stationRowContent } from "./station-row";
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
  it("numbers rows from one for list position", () => {
    expect(stationRowContent(station(), 0, false).index).toBe(1);
    expect(stationRowContent(station(), 41, false).index).toBe(42);
  });

  it("keeps country and first tag on the secondary line", () => {
    const row = stationRowContent(station(), 0, false);
    expect(row.meta).toBe("The United States Of America · jazz");
    expect(row.genre).toBe("jazz");
  });

  it("falls back to a global label when the directory has no country", () => {
    expect(stationRowContent(station({ country: "", tags: [] }), 0, false).meta).toBe("全球 · MP3 · 128k");
  });

  it("formats bitrate for the quality chip and keeps codec only streams", () => {
    expect(stationRowContent(station(), 0, false).quality).toBe("MP3 · 128k");
    expect(stationRowContent(station({ bitrate: 0 }), 0, false).quality).toBe("MP3");
    expect(stationRowContent(station({ codec: "", bitrate: 0 }), 0, false).quality).toBe("LIVE");
  });

  it("names the favourite control without hover text", () => {
    expect(stationRowContent(station(), 0, false).likeLabel).toBe("喜欢 Jazz24");
    expect(stationRowContent(station(), 0, true).likeLabel).toBe("取消喜欢 Jazz24");
  });
});

describe("immersive player and list contract", () => {
  const css = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");
  const viewSource = readFileSync(fileURLToPath(new URL("./radio-view.ts", import.meta.url)), "utf8");

  it("hides the host view header and removes extra content padding", () => {
    expect(css).toMatch(/\.workspace-leaf-content\[data-type="qiaomu-radio-view"\] > \.view-header\s*{[^}]*display: none;/);
    expect(css).toMatch(/\.workspace-leaf-content\[data-type="qiaomu-radio-view"\] > \.view-content\s*{[^}]*padding: 0;/);
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

  it("keeps the list free of zebra striping so only the current row is highlighted", () => {
    expect(css).not.toMatch(/nth-child\((?:odd|even)\)/);
    expect(css).toMatch(/\.qiaomu-radio__station\.is-current\s*{[^}]*background: var\(--qr-accent-soft\)/);
    expect(css).toMatch(/\.qiaomu-radio__station\.is-current \.qiaomu-radio__station-index\s*{[^}]*color: var\(--qr-accent\)/);
  });

  it("gives the favourite control a visible resting state", () => {
    expect(css).toMatch(/\.qiaomu-radio__station-like\s*{[^}]*color: var\(--text-faint\)/);
    expect(css).toMatch(/\.qiaomu-radio__station-like:hover/);
  });

  it("never generates hover tips from the player view", () => {
    for (const pattern of ["aria-label", "setTooltip", "title=", "data-tooltip"]) {
      expect(viewSource).not.toContain(pattern);
    }
    expect(viewSource).toContain("qiaomu-radio__sr-only");
    expect(css).toMatch(/\.qiaomu-radio__sr-only\s*{[^}]*clip: rect/);
  });

  it("ships only the original and iPod players in the plugin view", () => {
    expect(viewSource).not.toMatch(/RamsRadio|ClassicPlayer|PlayerSkin|fantasy/);
  });
});

import { describe, expect, it } from "vitest";
import { getTheme, RADIO_THEMES, themeQuery } from "./themes";

describe("radio themes", () => {
  it("gives every skin a distinct id and playable series", () => {
    expect(new Set(RADIO_THEMES.map((theme) => theme.id)).size).toBe(RADIO_THEMES.length);
    expect(RADIO_THEMES.every((theme) => theme.mood && theme.source)).toBe(true);
  });

  it("routes China Wave to the curated provider", () => {
    expect(themeQuery("china")).toEqual({ mood: "world", source: "china-curated" });
  });

  it("routes the fantasy 3D player to the live global energy series", () => {
    expect(themeQuery("fantasy")).toEqual({ mood: "energy", source: "radio-browser" });
  });

  it("falls back to the editorial theme for an unknown persisted value", () => {
    expect(getTheme("missing" as never).id).toBe("editorial");
  });
});

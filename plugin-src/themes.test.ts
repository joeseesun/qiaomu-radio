import { describe, expect, it } from "vitest";
import { normalizeTheme, RADIO_THEMES } from "./themes";

describe("Obsidian radio themes", () => {
  it("only exposes the original and iPod players", () => {
    expect(RADIO_THEMES.map((theme) => theme.id)).toEqual(["classic", "pocket"]);
  });

  it("migrates removed and invalid themes to the original player", () => {
    expect(normalizeTheme(undefined)).toBe("classic");
    expect(normalizeTheme("unknown")).toBe("classic");
    expect(normalizeTheme("rams")).toBe("classic");
    expect(normalizeTheme("fantasy")).toBe("classic");
    expect(normalizeTheme("pocket")).toBe("pocket");
  });
});

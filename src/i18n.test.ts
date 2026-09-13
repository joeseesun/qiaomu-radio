import { describe, expect, it } from "vitest";
import { detectLocale, LOCALES, message, regionName } from "./i18n";

describe("radio interface languages", () => {
  it("supports six locales and follows browser preference", () => {
    expect(LOCALES).toHaveLength(6);
    expect(detectLocale(["pt-BR", "fr-FR"])).toBe("fr");
    expect(detectLocale(["ko-KR"])).toBe("en");
  });
  it("translates core controls and country names", () => {
    for (const locale of LOCALES) expect(message(locale, "action.play")).not.toBe("");
    for (const locale of LOCALES) expect(message(locale, "search.global")).toMatch(/20/);
    expect(regionName("de", "JP", "Japan")).toMatch(/Japan/i);
  });
});

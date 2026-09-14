import { describe, expect, it } from "vitest";
import { resolveLocale, translate, displayName } from "./i18n";
describe("interface language", () => {
  it("follows OS language preferences with English fallback", () => {
    expect(resolveLocale("auto", ["zh-Hans-CN"])).toBe("zh");
    expect(resolveLocale("auto", ["pt-BR"])).toBe("pt");
    expect(resolveLocale("auto", ["xx", "ja-JP"])).toBe("ja");
    expect(resolveLocale("auto", [])).toBe("en");
    expect(resolveLocale("de", ["zh-CN"])).toBe("de");
    expect(resolveLocale("toString", ["xx"])).toBe("en");
  });
  it("translates core controls in ten languages", () => {
    expect(translate("播放", "en")).toBe("Play");
    expect(translate("播放", "ja")).toBe("再生");
    expect(translate("播放", "ar")).toBe("تشغيل");
    expect(translate("播放", "zh")).toBe("播放");
    expect(displayName("DE", "region", "en", "Germany")).toBe("Germany");
  });
});

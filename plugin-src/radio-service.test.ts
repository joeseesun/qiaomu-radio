import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));
import { requestUrl } from "obsidian";
import { RadioService } from "./radio-service";
const request = vi.mocked(requestUrl);
beforeEach(() => { request.mockReset(); });
describe("directory queries", () => {
  it("shares the underlying feed for recommend and focus", async () => {
    request.mockResolvedValue({ json: [] } as never);
    const service = new RadioService();
    await service.stations("recommend");
    await service.stations("focus");
    expect(request).toHaveBeenCalledTimes(1);
    expect(service.cached("focus")?.stations).toEqual([]);
  });
  it("sends tag, region and language as separate constraints", async () => {
    request.mockResolvedValue({ json: [] } as never);
    await new RadioService().stations("recommend", "", { tag: "news", country: "GB", language: "english" });
    const url = new URL((request.mock.calls[0][0] as { url: string }).url);
    expect(url.searchParams.get("tag")).toBe("news");
    expect(url.searchParams.get("countrycode")).toBe("GB");
    expect(url.searchParams.get("language")).toBe("english");
    expect(url.searchParams.get("tagExact")).toBe("true");
    expect(url.searchParams.get("languageExact")).toBe("true");
    expect(url.searchParams.get("order")).toBe("clickcount");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not silently substitute an unrelated fallback for a filtered query", async () => {
    request.mockImplementation(() => { throw Error("offline"); });
    const message = await new RadioService().stations("focus", "", { tag: "news" }).then(() => "unexpected success", error => String(error));
    expect(message).toContain("分类目录");
    expect(request).toHaveBeenCalledTimes(3);
  });
});

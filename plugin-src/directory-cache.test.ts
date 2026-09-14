import { afterEach, describe, expect, it, vi } from "vitest";
import { DirectoryCache } from "./directory-cache";

afterEach(() => vi.useRealTimers());
describe("directory cache", () => {
  it("coalesces concurrent requests and reuses fresh results", async () => {
    const cache = new DirectoryCache<string[]>();
    const fetcher = vi.fn(async () => ["station"]);
    const first = cache.get("jazz", fetcher);
    expect(cache.get("jazz", fetcher)).toBe(first);
    await first;
    await cache.get("jazz", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.peek("jazz")).toEqual(["station"]);
  });
  it("exposes stale results while refreshing and preserves them on failure", async () => {
    vi.useFakeTimers();
    const cache = new DirectoryCache<string>();
    await cache.get("a", async () => "old");
    vi.advanceTimersByTime(16 * 60 * 1000);
    const request = cache.get("a", async () => { throw Error("offline"); });
    expect(cache.peek("a")).toBe("old");
    await expect(request).rejects.toThrow("offline");
    expect(cache.peek("a")).toBe("old");
    await cache.get("a", async () => "new");
    expect(cache.peek("a")).toBe("new");
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    expect(cache.peek("a")).toBeUndefined();
  });
  it("bounds memory across many searches", async () => {
    const cache = new DirectoryCache<number>();
    for (let i = 0; i < 60; i++) await cache.get(String(i), async () => i);
    expect(cache.peek("0")).toBeUndefined();
    expect(cache.peek("59")).toBe(59);
  });
});

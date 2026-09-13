import { beforeEach, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({ factory: vi.fn() }));

vi.mock("hls.js", () => {
  mocked.factory();
  return { default: class MockHls {} };
});

beforeEach(() => {
  vi.resetModules();
  mocked.factory.mockClear();
});

it("loads the HLS runtime on demand and reuses the same request", async () => {
  const { loadHlsRuntime } = await import("./hlsRuntime");
  expect(mocked.factory).not.toHaveBeenCalled();

  const first = loadHlsRuntime();
  const second = loadHlsRuntime();

  expect(second).toBe(first);
  await expect(first).resolves.toBeTypeOf("function");
  expect(mocked.factory).toHaveBeenCalledOnce();
});

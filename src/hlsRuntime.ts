import type Hls from "hls.js";

let runtime: Promise<typeof Hls> | null = null;

export function loadHlsRuntime() {
  runtime ??= import("hls.js").then((module) => module.default);
  return runtime;
}

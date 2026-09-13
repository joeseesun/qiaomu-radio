import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelLoader } from "./ModelLoader";

describe("fantasy model loader", () => {
  it("renders only the transparent rune while keeping accessible progress", () => {
    const html = renderToStaticMarkup(<ModelLoader fantasy progress={0.42} />);

    expect(html).toContain('aria-valuenow="42"');
    expect(html).toContain("warcraft-loading-rune.png");
    expect(html).not.toContain("model-loader-progress");
    expect(html).not.toContain("--model-progress");
  });
});

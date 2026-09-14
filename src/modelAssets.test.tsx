import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FANTASY_MODEL_URL, FantasyModelPreload } from "./modelAssets";

describe("fantasy model delivery", () => {
  it("preloads the model while the lazy 3D runtime is downloading", () => {
    const html = renderToStaticMarkup(<FantasyModelPreload />);

    expect(html).toContain(`href="${FANTASY_MODEL_URL}"`);
    expect(html).toContain('rel="preload"');
    expect(html).toContain('as="fetch"');
    expect(html).toContain('crossorigin="anonymous"');
  });
});

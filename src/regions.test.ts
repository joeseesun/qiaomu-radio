import { describe, expect, it } from "vitest";
import { RADIO_REGIONS } from "./regions";

describe("regional station picker", () => {
  it("offers 20 unique major regions", () => {
    expect(RADIO_REGIONS).toHaveLength(20);
    expect(new Set(RADIO_REGIONS).size).toBe(20);
    expect(RADIO_REGIONS).toEqual(expect.arrayContaining(["CN", "US", "GB", "DE", "FR", "JP"]));
  });
});

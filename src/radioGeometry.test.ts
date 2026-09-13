import { describe, expect, it } from "vitest";
import { controlGeometry } from "./radioGeometry";

describe("all physical controls use precision geometry", () => {
  for (const [name, radius] of [["tuning", .183], ["volume", .065], ["playback", .041]] as const) {
    it(`${name} has a round profile, finite normals and the same cap depth`, () => {
      const geometry = controlGeometry(radius, .08);
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.max.x).toBeCloseTo(radius, 5);
      expect(geometry.boundingBox!.min.x).toBeCloseTo(-radius, 5);
      expect(geometry.boundingBox!.max.z).toBeCloseTo(.04, 5);
      expect(geometry.boundingBox!.min.z).toBeCloseTo(-.04, 5);
      expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
      geometry.dispose();
    });
  }
});

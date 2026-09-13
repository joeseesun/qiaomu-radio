import { describe, expect, it } from "vitest";
import { clockwiseArc, detents, turnVolume, volumeAngle, VOLUME_SWEEP } from "./radioGestures";

describe("physical rotary gestures", () => {
  it("tracks two clockwise revolutions without jumping at the angle seam", () => {
    let previous = 0, total = 0;
    for (let i = 1; i <= 240; i++) {
      const angle = Math.atan2(Math.sin(-i * Math.PI / 60), Math.cos(-i * Math.PI / 60));
      total += clockwiseArc(previous, angle); previous = angle;
    }
    expect(total).toBeCloseTo(Math.PI * 4);
    expect(detents(total)).toBe(40);
    expect(detents(-total)).toBe(-40);
  });
  it("has a 270 degree sweep and no dead travel when reversing at a stop", () => {
    let value = turnVolume(.9, Math.PI);
    expect(value).toBe(1);
    value = turnVolume(value, Math.PI * 4);
    expect(value).toBe(1);
    expect(turnVolume(value, -VOLUME_SWEEP * .1)).toBeCloseTo(.9);
    expect(turnVolume(0, -Math.PI)).toBe(0);
    expect(turnVolume(0, VOLUME_SWEEP * .1)).toBeCloseTo(.1);
    expect(volumeAngle(0) - volumeAngle(1)).toBeCloseTo(VOLUME_SWEEP);
  });
  it("keeps the pointer within the printed endpoints", () => {
    expect(volumeAngle(-1)).toBe(volumeAngle(0));
    expect(volumeAngle(2)).toBe(volumeAngle(1));
    expect(volumeAngle(.5)).toBe(0);
  });
});

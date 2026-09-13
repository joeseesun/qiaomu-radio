import { describe, expect, it } from "vitest";
import { MAX_PRESS_DEPTH, pulsePressMotion, stepPressMotion, type PressMotion } from "./radioPressFeedback";

describe("3D radio button feedback", () => {
  it("acknowledges sub-frame taps and stays frame-rate independent",()=>{
    const tap=pulsePressMotion({depth:0,velocity:0,pulse:0});
    expect(tap.depth).toBeGreaterThan(MAX_PRESS_DEPTH*.8);
    const results=[30,60,120].map(fps=>{
      let motion=tap;
      for(let i=0;i<fps/5;i++)motion=stepPressMotion(motion,false,1/fps);
      return motion.depth;
    });
    expect(results[0]).toBeCloseTo(results[1],10);
    expect(results[1]).toBeCloseTo(results[2],10);
  });
  it("compresses while held and springs back after release", () => {
    let motion: PressMotion = { depth: 0, velocity: 0, pulse: 0 };
    for (let frame = 0; frame < 18; frame += 1) motion = stepPressMotion(motion, true, 1 / 60);
    expect(motion.depth).toBeGreaterThan(MAX_PRESS_DEPTH * 0.8);

    for (let frame = 0; frame < 36; frame += 1) motion = stepPressMotion(motion, false, 1 / 60);
    expect(Math.abs(motion.depth)).toBeLessThan(0.001);
  });

  it("uses an immediate state change when reduced motion is requested", () => {
    const pressed = stepPressMotion({ depth: 0, velocity: 1, pulse: 1 }, true, 1 / 60, true);
    expect(pressed).toEqual({ depth: MAX_PRESS_DEPTH, velocity: 0, pulse: 0 });
  });

  it("adds a short confirmation pulse", () => {
    const pulsed = pulsePressMotion({ depth: 0, velocity: 0, pulse: 0 });
    expect(stepPressMotion(pulsed, false, 0.1).pulse).toBeLessThan(1);
  });
});

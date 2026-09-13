import { expect,it } from "vitest";
import { stepSpeakerMotion,speakerExcursion,speakerVisual } from "./fantasySpeakerMotion";

it("ramps up only audible playback, then settles when paused, buffering or muted",()=>{
  let state={level:0,phase:0};
  for(let i=0;i<60;i++)state=stepSpeakerMotion(state,1/60,true,.64);
  expect(state.level).toBeCloseTo(.8,3);
  expect(Math.abs(speakerExcursion(state,0))).toBeLessThanOrEqual(.012);
  const visual=speakerVisual(state,0);
  expect(visual.scale).toBeGreaterThanOrEqual(.916);
  expect(visual.scale).toBeLessThanOrEqual(1.084);
  expect(visual.opacity).toBeGreaterThan(0);
  for(let i=0;i<60;i++)state=stepSpeakerMotion(state,1/60,false,.64);
  expect(state.level).toBe(0);
  expect(speakerVisual(state,0).opacity).toBe(0);
  for(let i=0;i<60;i++)state=stepSpeakerMotion(state,1/60,true,0);
  expect(speakerExcursion(state,1)).toBe(0);
});
it("disables continuous movement for reduced motion",()=>{
  const state=stepSpeakerMotion({level:1,phase:1},1/60,true,1,true);
  expect(speakerExcursion(state,0)).toBe(0);
});

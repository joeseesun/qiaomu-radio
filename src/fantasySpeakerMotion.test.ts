import { expect,it } from "vitest";
import { stepSpeakerMotion,speakerExcursion } from "./fantasySpeakerMotion";

it("ramps up only audible playback, then settles when paused, buffering or muted",()=>{
  let state={level:0,phase:0};
  for(let i=0;i<60;i++)state=stepSpeakerMotion(state,1/60,true,.64);
  expect(state.level).toBeCloseTo(.8,3);
  expect(Math.abs(speakerExcursion(state,0))).toBeLessThanOrEqual(.012);
  for(let i=0;i<60;i++)state=stepSpeakerMotion(state,1/60,false,.64);
  expect(state.level).toBe(0);
  for(let i=0;i<60;i++)state=stepSpeakerMotion(state,1/60,true,0);
  expect(speakerExcursion(state,1)).toBe(0);
});
it("disables continuous movement for reduced motion",()=>{
  const state=stepSpeakerMotion({level:1,phase:1},1/60,true,1,true);
  expect(speakerExcursion(state,0)).toBe(0);
});

import { expect, it } from "vitest";
import { clampVolume, tuningSteps, radioPartIndex } from "./radioGestures";
it("keeps volume at the mechanical stops",()=>{expect(clampVolume(-.2)).toBe(0);expect(clampVolume(1.2)).toBe(1);expect(clampVolume(.52)).toBe(.52);});
it("tunes in whole detents without switching on a tiny movement",()=>{expect(tuningSteps(7,0)).toBe(0);expect(tuningSteps(36,0)).toBe(2);expect(tuningSteps(0,36)).toBe(-2);expect(tuningSteps(20,20)).toBe(0);});
it("recognizes GLTFLoader-normalized BANG part names",()=>{expect(radioPartIndex("root.2")).toBe(2);expect(radioPartIndex("root2")).toBe(2);expect(radioPartIndex("root_0")).toBe(0);expect(radioPartIndex("ROOT")).toBeNaN();});

import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("ships the five BANG parts used by the hardware controls", () => {
  const bytes = readFileSync(new URL("../artifacts/models/radio-parts.glb", import.meta.url));
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  const gltf = JSON.parse(bytes.subarray(20,20 + bytes.readUInt32LE(12)).toString());
  expect(gltf.meshes.map((mesh: {name: string})=>mesh.name)).toEqual(["root.0","root.1","root.2","root.3","root.4"]);
  const display = gltf.accessors[gltf.meshes[1].primitives[0].attributes.POSITION];
  expect(display.min[0]).toBeCloseTo(.28125,3);
  expect(display.max[2]).toBeCloseTo(.27247,3);
});

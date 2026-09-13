import { afterAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { createRadioModel, RADIO_FLOOR, RADIO_SCREEN } from "./radioModel";

describe("self-contained parametric radio", () => {
  const radio = createRadioModel();
  const { device, parts, knobs } = radio;
  afterAll(() => device.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    }
  }));
  it("builds finite geometry with grounded feet and no external textures", () => {
    expect(new THREE.Box3().setFromObject(device).min.y).toBeCloseTo(RADIO_FLOOR, 5);
    for (const { mesh, origin } of parts) {
      expect(mesh.position.equals(origin)).toBe(true);
      expect(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      expect(Array.from(mesh.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
      expect(Object.values(mesh.material).some(value => value instanceof THREE.Texture)).toBe(false);
    }
  });
  it("aligns the physical screen to the readable UI plane", () => {
    expect(knobs.screen.position.x).toBe(RADIO_SCREEN.x);
    expect(knobs.screen.position.y).toBe(RADIO_SCREEN.y);
    expect(new THREE.Box3().setFromObject(knobs.screen).max.z).toBeLessThan(RADIO_SCREEN.z);
  });
  it("control caps are hittable at front and side angles", () => {
    for (const angle of [0, -1.15, 1.15]) {
      device.rotation.y = angle; device.updateMatrixWorld(true);
      for (const action of ["tune", "volume", "power"]) {
        const center = knobs[action].getWorldPosition(new THREE.Vector3());
        const camera = new THREE.Vector3(.75, .48, 3.35);
        const ray = new THREE.Raycaster(camera, center.clone().sub(camera).normalize());
        const hit = ray.intersectObjects(device.children, true)[0]?.object;
        expect(hit?.userData.action || hit?.parent?.userData.action).toBe(action);
      }
    }
    device.rotation.y = 0; device.updateMatrixWorld(true);
  });
  it("every detachable root has a stable rest pose and explosion direction", () => {
    expect(parts.length).toBe(device.children.length);
    expect(new Set(parts.map(part => part.mesh.name)).size).toBe(parts.length);
    expect(parts.every(part => part.offset.length() > 0)).toBe(true);
  });
  it("seats the grille flush and keeps the stop scale separate from the turning knob", () => {
    const grille = device.getObjectByName("speaker-grille")!;
    const face = device.getObjectByName("front-panel")!;
    expect(new THREE.Box3().setFromObject(grille).max.z).toBeCloseTo(new THREE.Box3().setFromObject(face).max.z, 5);
    const scale = device.getObjectByName("volume-scale")!;
    expect(scale.parent).toBe(device);
    expect(scale.children.length).toBe(16);
    knobs.volume.rotation.z = 2;
    expect(scale.rotation.z).toBe(0);
    knobs.volume.rotation.z = 0;
    expect(device.getObjectByName("front-gasket")).toBeUndefined();
  });
  it("keeps the speaker assembly as fixed hardware instead of a playback control", () => {
    const backing = device.getObjectByName("speaker-backing")!;
    expect(backing.userData.action).toBeUndefined();
    expect(radio).not.toHaveProperty("speaker");
  });
});

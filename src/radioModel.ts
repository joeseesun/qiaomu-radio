import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { controlGeometry, roundedPanel } from "./radioGeometry";

export const RADIO_SCREEN = { x: .5646, y: .3597, z: .276, width: .551 };
export const RADIO_FLOOR = -.527;
type Part = { mesh: THREE.Mesh; origin: THREE.Vector3; offset: THREE.Vector3 };

/** A complete, synchronous assembly: no model, texture or network dependencies. */
export function createRadioModel() {
  const device = new THREE.Group();
  device.name = "parametric-radio";
  const parts: Part[] = [];
  const knobs: Record<string, THREE.Mesh> = {};
  const material = (color: number, roughness = .6, metalness = .03) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const shell = material(0xe4e5dd), face = material(0xe9eae2), rubber = material(0x34382f, .92);
  const silver = material(0xbfc3bb, .38, .78), trim = material(0x9a9f92, .5, .35);
  const add = (name: string, geometry: THREE.BufferGeometry, surface: THREE.Material, position: [number, number, number], offset: [number, number, number] = [0, 0, -.16], action?: string) => {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
    if (action) mesh.userData.action = action;
    device.add(mesh); parts.push({ mesh, origin: mesh.position.clone(), offset: new THREE.Vector3(...offset) });
    return mesh;
  };
  const box = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 5, r);

  // Overlapping shell lip: no exposed gasket or floating front plate.
  add("enclosure", box(1.9, 1, .582, .018), shell, [0, .017, -.027]);
  const frontShape = roundedPanel(1.88, .98, .014);
  const speakerOpening = new THREE.Path(roundedPanel(1.076, .936, .004).getPoints(16).map(point => point.add(new THREE.Vector2(-.385, -.009))));
  frontShape.holes.push(speakerOpening);
  add("front-panel", new THREE.ExtrudeGeometry(frontShape, { depth: .008, bevelEnabled: false, curveSegments: 16 }), face, [0, .017, .263], [0, 0, .12]);
  add("back-cover", box(1.83, .93, .025, .012), shell, [0, .017, -.324], [0, 0, -.35]);
  for (const x of [-.75, .75]) for (const z of [-.21, .18]) {
    add(`foot-${x}-${z}`, new THREE.CylinderGeometry(.055, .048, .05, 48), rubber, [x, RADIO_FLOOR + .025, z]);
  }
  for (const x of [-.82, .82]) for (const y of [-.38, .41]) {
    const screw = add(`rear-screw-${x}-${y}`, controlGeometry(.016, .004), trim, [x, y, -.339], [0, 0, -.35]);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.019, .003, .001), rubber);
    slot.position.z = -.0025; screw.add(slot);
  }

  const controls = [
    { name: "tune", radius: .183, x: .5724, y: .0301, z: .310, surface: silver },
    { name: "volume", radius: .065, x: .4226, y: -.2908, z: .310, surface: material(0x363b34, .38, .12) },
    { name: "power", radius: .041, x: .7315, y: -.3001, z: .310, surface: material(0xce712d, .38, .12) },
  ];
  for (const { name, radius, x, y, z, surface } of controls) {
    const offset: [number, number, number] = [(x - .5) * .35, (y - .05) * .3, .42];
    const knob = add(name, controlGeometry(radius, .08), surface, [x, y, z], offset, name);
    knobs[name] = knob;
    if (name !== "power") {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(.008, .026, .003), material(name === "tune" ? 0x50584b : 0xd8dfce, .7));
      mark.position.set(0, radius * .74, .042); knob.add(mark);
    }
    add(`${name}-collar`, new THREE.TorusGeometry(radius + .002, .003, 16, 128), trim, [x, y, .274], [0, 0, .12], name);
  }

  // The scale stays on the faceplate. Its blank lower quadrant is the hard stop.
  const ink = material(0x656d5d, .9);
  const scale = add("volume-scale", new THREE.RingGeometry(.088, .0895, 96, 1, -Math.PI / 4, Math.PI * 1.5), ink, [.4226, -.2908, .272], [0, 0, .12], "volume");
  for (let i = 0; i <= 12; i++) {
    const angle = Math.PI * 1.25 - i / 12 * Math.PI * 1.5;
    const end = i === 0 || i === 12;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(end ? .0035 : .0018, end ? .019 : .007, .001), ink);
    tick.position.set(Math.cos(angle) * .094, Math.sin(angle) * .094, .001);
    tick.rotation.z = angle - Math.PI / 2; scale.add(tick);
  }
  for (const sign of [-1, 1]) {
    const minus = new THREE.Mesh(new THREE.BoxGeometry(.012, .0025, .001), ink);
    minus.position.set(sign * .077, -.087, .001); scale.add(minus);
    if (sign === 1) { const plus = minus.clone(); plus.rotation.z = Math.PI / 2; scale.add(plus); }
  }

  knobs.screen = add("screen", box(.567, .162, .018, .004), material(0x17221e, .3), [RADIO_SCREEN.x, RADIO_SCREEN.y, .264], [0, .1, .42], "screen");
  const bezelShape = roundedPanel(.604, .198, .013);
  bezelShape.holes.push(roundedPanel(.554, .156, .004));
  add("screen-bezel", new THREE.ExtrudeGeometry(bezelShape, { depth: .008, bevelEnabled: true, bevelSize: .0015, bevelThickness: .0015, bevelSegments: 3, curveSegments: 16 }), material(0xc5c9bd, .45, .35), [RADIO_SCREEN.x, RADIO_SCREEN.y, .273], [0, 0, .12], "screen");

  const grilleShape = roundedPanel(1.08, .94, .006);
  for (let row = 0; row < 29; row++) for (let col = 0; col < 33; col++) {
    const hole = new THREE.Path(); hole.absarc((col - 16) * .03, (row - 14) * .03, .006, 0, Math.PI * 2, true);
    grilleShape.holes.push(hole);
  }
  add("speaker-grille", new THREE.ExtrudeGeometry(grilleShape, { depth: .006, bevelEnabled: false, curveSegments: 8 }), face, [-.385, .008, .265], [-.12, 0, .35]);
  add("speaker-backing", new THREE.PlaneGeometry(1.076, .936), rubber, [-.385, .008, .2645]);
  device.updateMatrixWorld(true);
  return { device, parts, knobs };
}

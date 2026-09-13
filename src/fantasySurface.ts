import * as THREE from "three";
import { roundedPanel } from "./radioGeometry";

export const FANTASY_SCREEN = { x: -.015, y: .28, width: .89, height: .30 };
export const FANTASY_CONTROLS = [
  { action: "previous", x: -.60, y: -.17, radius: .105, minZ: .255, color: 0xf3c46a },
  { action: "power", x: -.25, y: -.17, radius: .13, minZ: .29, color: 0x69caff },
  { action: "next", x: .08, y: -.17, radius: .105, minZ: .255, color: 0xf3c46a },
  { action: "favorite", x: .355, y: -.17, radius: .095, minZ: .265, color: 0xff7083 },
  { action: "volume", x: .705, y: -.205, radius: .125, minZ: .33, color: 0xf3c46a },
] as const;
export type FantasyAction = typeof FANTASY_CONTROLS[number]["action"] | "screen";

export const FANTASY_SPEAKERS = [
  { x: -.96, y: .25, radius: .245 },
  { x: .92, y: .25, radius: .245 },
] as const;

/** Only the inner diaphragm moves; the cast-metal surround remains stationary. */
export function bindFantasySpeakers(model: THREE.Object3D) {
  const vertices: Array<{position: THREE.BufferAttribute; index: number; z: number; weight: number; speaker: number}> = [];
  model.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const position = child.geometry.attributes.position as THREE.BufferAttribute;
    const scale = child.getWorldScale(new THREE.Vector3()).z;
    for (let i=0;i<position.count;i++) {
      const point = new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(child.matrixWorld);
      FANTASY_SPEAKERS.forEach((s,speaker)=>{
        const radius=Math.hypot(point.x-s.x,point.y-s.y)/s.radius;
        const weight=(1-THREE.MathUtils.smoothstep(radius,.45,1))*THREE.MathUtils.smoothstep(point.z,.20,.27)/scale;
        if(weight>0)vertices.push({position,index:i,z:position.getZ(i),weight,speaker});
      });
    }
  });
  return (excursions: readonly number[]) => {
    for(const v of vertices){
      const z=v.z+(excursions[v.speaker]||0)*v.weight;
      if(Math.abs(v.position.getZ(v.index)-z)>1e-8){v.position.setZ(v.index,z);v.position.needsUpdate=true;}
    }
  };
}

export function normalizeFantasyModel(model: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(model);
  model.scale.setScalar(2.85 / bounds.getSize(new THREE.Vector3()).x);
  model.updateMatrixWorld(true);
  bounds.setFromObject(model); model.position.sub(bounds.getCenter(new THREE.Vector3()));
  model.updateMatrixWorld(true);
  model.position.y += -.52 - new THREE.Box3().setFromObject(model).min.y;
  model.updateMatrixWorld(true);
}

/** Front projection onto the actual surface, not the furthest horn/knob bounding box. */
export function surfacePoint(model: THREE.Object3D, x: number, y: number) {
  return new THREE.Raycaster(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1))
    .intersectObject(model, true)[0]?.point;
}

export function surfacePatch(model: THREE.Object3D, x: number, y: number, width: number, height: number, segments = 16, radius = 0) {
  const geometry = radius ? new THREE.ShapeGeometry(roundedPanel(width,height,radius),segments) : new THREE.PlaneGeometry(width, height, segments, Math.max(4, Math.round(segments * height / width)));
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const px = position.getX(i) + x, py = position.getY(i) + y;
    const point = surfacePoint(model, px, py);
    if (!point) { geometry.dispose(); throw new Error("Radio surface calibration missed the model"); }
    position.setXYZ(i, px, py, point.z + .0015);
    if(radius)geometry.attributes.uv.setXY(i,(px-x)/width+.5,(py-y)/height+.5);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function fantasyActionAt(point: THREE.Vector3): FantasyAction | undefined {
  const s = FANTASY_SCREEN;
  if (point.z > .22 && Math.abs(point.x - s.x) < s.width / 2 && Math.abs(point.y - s.y) < s.height / 2) return "screen";
  return FANTASY_CONTROLS.find(c => point.z > c.minZ && Math.hypot((point.x-c.x), (point.y-c.y)) < c.radius * 1.14)?.action;
}

/** Deform only control-front vertices. Original UVs and the rest of the asset stay intact. */
export function bindFantasyPress(model: THREE.Object3D) {
  const bindings: Array<{ position: THREE.BufferAttribute; normal?: THREE.BufferAttribute; vertices: Array<{ index: number; rest: THREE.Vector3; world: THREE.Vector3; normal?: THREE.Vector3; weight: number; action: string }>; zScale: number; inverse: THREE.Matrix4 }> = [];
  model.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const position = child.geometry.attributes.position as THREE.BufferAttribute;
    const normal = child.geometry.attributes.normal as THREE.BufferAttribute | undefined;
    const vertices: typeof bindings[number]["vertices"] = [];
    for (let i = 0; i < position.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
      for (const c of FANTASY_CONTROLS) {
        const r = Math.hypot(point.x - c.x, point.y - c.y) / c.radius;
        const weight = (1 - THREE.MathUtils.smoothstep(r, .7, 1.25)) * THREE.MathUtils.smoothstep(point.z, c.minZ-.025, c.minZ+.02);
        if (weight > 0) vertices.push({ index: i, rest: new THREE.Vector3().fromBufferAttribute(position,i), world: point.clone(), normal: normal ? new THREE.Vector3().fromBufferAttribute(normal,i) : undefined, weight, action: c.action });
      }
    }
    bindings.push({ position, normal, vertices, zScale: child.getWorldScale(new THREE.Vector3()).z, inverse: child.matrixWorld.clone().invert() });
  });
  return (depths: ReadonlyMap<string, number>, volumeRotation = 0) => {
    for (const { position, normal, vertices, zScale, inverse } of bindings) {
      let dirty = false;
      for (const vertex of vertices) {
        const point=vertex.rest.clone();
        if(vertex.action==="volume"&&volumeRotation!==0){
          const c=FANTASY_CONTROLS[4],angle=volumeRotation*vertex.weight,dx=vertex.world.x-c.x,dy=vertex.world.y-c.y;
          point.set(c.x+dx*Math.cos(angle)-dy*Math.sin(angle),c.y+dx*Math.sin(angle)+dy*Math.cos(angle),vertex.world.z).applyMatrix4(inverse);
        }
        point.z-=(depths.get(vertex.action)||0)*vertex.weight/zScale;
        if(Math.abs(position.getX(vertex.index)-point.x)+Math.abs(position.getY(vertex.index)-point.y)+Math.abs(position.getZ(vertex.index)-point.z)>1e-7){
          position.setXYZ(vertex.index,point.x,point.y,point.z);dirty=true;
          if(normal&&vertex.normal){const angle=vertex.action==="volume"?volumeRotation*vertex.weight:0,n=vertex.normal;normal.setXYZ(vertex.index,n.x*Math.cos(angle)-n.y*Math.sin(angle),n.x*Math.sin(angle)+n.y*Math.cos(angle),n.z);}
        }
      }
      if (dirty) { position.needsUpdate = true; if(normal)normal.needsUpdate=true; }
    }
  };
}

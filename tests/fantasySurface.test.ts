import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { bindFantasySpeakers, FANTASY_SPEAKERS } from "../src/fantasySurface";
import { bindFantasyPress, fantasyActionAt, FANTASY_CONTROLS, FANTASY_SCREEN, normalizeFantasyModel, surfacePatch, surfacePoint } from "../src/fantasySurface";

// Read only the geometry from the shipped GLB; no DOM, texture decoding or network needed.
const bytes=readFileSync(new URL("../public/models/qiaomu-fantasy-radio-hyper3d-v1.glb",import.meta.url));
const length=bytes.readUInt32LE(12), json=JSON.parse(bytes.subarray(20,20+length).toString()), start=length+28;
const attribute=(index:number,size:number)=>{
  const a=json.accessors[index],v=json.bufferViews[a.bufferView],offset=bytes.byteOffset+start+(v.byteOffset||0)+(a.byteOffset||0);
  return new THREE.BufferAttribute(a.componentType===5126?new Float32Array(bytes.buffer,offset,a.count*size).slice():new Uint16Array(bytes.buffer,offset,a.count*size).slice(),size);
};
const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",attribute(0,3));geometry.setIndex(attribute(3,1));
const model=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());normalizeFantasyModel(model);
afterAll(()=>{geometry.dispose();model.material.dispose();});

describe("fantasy hardware surface calibration",()=>{
  it("moves only speaker interiors and restores them without geometry drift",()=>{
    const original=new Float32Array(geometry.attributes.position.array);
    const deform=bindFantasySpeakers(model);deform([.012,-.012]);
    let moved=0;
    for(let i=0;i<geometry.attributes.position.count;i++){
      if(original[i*3+2]===geometry.attributes.position.getZ(i))continue;
      moved++;
      const p=new THREE.Vector3(original[i*3],original[i*3+1],original[i*3+2]).applyMatrix4(model.matrixWorld);
      expect(FANTASY_SPEAKERS.some(s=>Math.hypot(p.x-s.x,p.y-s.y)<s.radius)).toBe(true);
      expect(p.z).toBeGreaterThan(.2);
      expect(Math.abs(geometry.attributes.position.getZ(i)-original[i*3+2])*model.scale.z).toBeLessThanOrEqual(.012001);
    }
    expect(moved).toBeGreaterThan(100);
    deform([0,0]);expect(Array.from(geometry.attributes.position.array)).toEqual(Array.from(original));
  });
  it("seats every screen vertex within two millimetres of the actual glass",()=>{
    const s=FANTASY_SCREEN,patch=surfacePatch(model,s.x,s.y,s.width,s.height,32,.04);
    const p=patch.attributes.position;
    for(let i=0;i<p.count;i++){
      const surface=surfacePoint(model,p.getX(i),p.getY(i))!;
      expect(p.getZ(i)-surface.z).toBeCloseTo(.0015,5);
      expect(p.getZ(i),`glass ${p.getX(i)}, ${p.getY(i)}`).toBeLessThan(.25); // not the old bounding-box front at .479
    }
    patch.dispose();
  });
  it("finds each control on its own physical depth and rejects the rear",()=>{
    for(const c of FANTASY_CONTROLS){
      const point=surfacePoint(model,c.x,c.y)!;
      expect(fantasyActionAt(point)).toBe(c.action);
      expect(fantasyActionAt(new THREE.Vector3(c.x,c.y,-.2))).toBeUndefined();
    }
  });
  it("moves actual button vertices and restores the original geometry on release",()=>{
    const original=new Float32Array(geometry.attributes.position.array);
    const deform=bindFantasyPress(model);deform(new Map([["power",.024]]));
    let moved=0;
    for(let i=2;i<original.length;i+=3)if(original[i]!==geometry.attributes.position.array[i])moved++;
    expect(moved).toBeGreaterThan(10);
    expect(moved).toBeLessThan(original.length/30);
    deform(new Map());expect(Array.from(geometry.attributes.position.array)).toEqual(Array.from(original));
    deform(new Map(),Math.PI/2);
    expect(Array.from(geometry.attributes.position.array)).not.toEqual(Array.from(original));
    deform(new Map(),0);expect(Array.from(geometry.attributes.position.array)).toEqual(Array.from(original));
  });
});

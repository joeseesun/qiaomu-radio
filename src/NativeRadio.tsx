import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { createRadioModel, RADIO_SCREEN, RADIO_FLOOR } from "./radioModel";
import type { PlayerProps } from "./PlayerSkin";
import type { NowPlaying } from "./useNowPlaying";
import { clampVolume, clockwiseArc, detents, TUNING_DETENT, turnVolume, volumeAngle } from "./radioGestures";
import { pulsePressMotion, stepPressMotion, type PressMotion } from "./radioPressFeedback";
import { SupportPanel } from "./SupportPanel";
import { ZoomOut } from "lucide-react";
import { speakerExcursion, stepSpeakerMotion } from "./fantasySpeakerMotion";

type Menu = "now" | "menu" | "stations" | "channels" | "favorites" | "history" | "search" | "support" | "explore";
type Row = { id: string; label: string; action: () => void };
type View = { reset: () => void; focus: () => void; explode: (value: boolean) => void; volume: (value: number) => void; tune: (delta: number) => void };

export default function NativeRadio({ player: p, track }: { player: PlayerProps; track: NowPlaying | null }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const [screenElement] = useState(() => document.createElement("div"));
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [menu, setMenu] = useState<Menu>("now");
  const [selection, setSelection] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [query, setQuery] = useState("");
  const [adjustingVolume, setAdjustingVolume] = useState(false);
  const rememberedVolume = useRef(.6);
  const [muted, setMuted] = useState(false);
  const physicalVolume = useRef(p.volume);
  physicalVolume.current = muted ? rememberedVolume.current : p.volume;
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tunedStationId = useRef<string | null>(null);
  const candidate = p.stations.find(s => s.id === preview);
  const go = (next: Menu) => { setMenu(next); setSelection(0); setPreview(null); if (next !== "now") view.current?.focus(); };
  const saved = [...new Map([...p.profile.history.map(e=>e.station),...p.stations,...(p.station?[p.station]:[])].map(s=>[s.id,s])).values()];
  const stationRows = (menu === "favorites" ? saved.filter(s=>p.profile.likedStationIds.includes(s.id)) : menu === "history" ? p.profile.history.map(e=>e.station) : p.stations).map(s=>({ id:s.id,label:s.name,action:()=>{p.onPlay(s);go("now");} }));
  const rows: Row[] = menu === "menu" ? [
    {id:"stations",label:"电台列表",action:()=>go("stations")},
    {id:"channels",label:"频道 / 中国电台",action:()=>go("channels")},
    {id:"search",label:"搜索电台",action:()=>go("search")},
    {id:"favorites",label:"收藏",action:()=>go("favorites")},
    {id:"history",label:"收听历史",action:()=>go("history")},
    {id:"support",label:"支持与关注",action:()=>go("support")},
    {id:"like",label:p.liked?"取消收藏当前电台":"收藏当前电台",action:()=>{if(p.station)p.onLike();}},
    {id:"dislike",label:"不喜欢，换一家",action:()=>{if(p.station)p.onDislike();go("now");}},
    {id:"explore",label:"探索机身",action:()=>go("explore")},
  ] : menu === "channels" ? [...p.moods.map(m=>({id:m.id,label:m.label,action:()=>{p.onMood(m.id);go("now");}})),{id:"china",label:"中国电台",action:()=>{p.onChina();go("now");}}] : menu === "explore" ? [
    {id:"explode",label:exploded?"合上机身":"拆解展示",action:()=>{const next=!exploded;setExploded(next);view.current?.explode(next);}},
    {id:"reset",label:"恢复正面视角",action:()=>{setExploded(false);view.current?.reset();go("now");}},
    {id:"back",label:"返回菜单",action:()=>go("menu")},
  ] : menu === "support" ? [] : stationRows;
  const current = useRef({p,menu,rows,selection,preview,go});
  current.current = {p,menu,rows,selection,preview,go};
  const volume = (value: number) => {
    const next = clampVolume(value);
    physicalVolume.current = next; setMuted(false); view.current?.volume(next);
    current.current.p.onVolume(next); setAdjustingVolume(true);
    clearTimeout(volumeTimer.current); volumeTimer.current=setTimeout(()=>setAdjustingVolume(false),1400);
  };
  const tune = (delta: number) => {
    const c=current.current;
    view.current?.tune(delta);
    if(c.menu!=="now") { setSelection(n=>Math.max(0,Math.min(Math.max(0,c.rows.length-1),n+delta))); return; }
    if(!c.p.stations.length)return;
    let i=c.p.stations.findIndex(s=>s.id===(tunedStationId.current||c.p.station?.id));
    if(i<0)i=delta>0?-1:0;
    const station=c.p.stations[(i+delta%c.p.stations.length+c.p.stations.length)%c.p.stations.length];
    tunedStationId.current=station.id;setPreview(station.id);c.p.onPlay(station);
  };
  const pressTune = () => {
    const c=current.current;
    if(c.menu!=="now") { c.rows[c.selection]?.action(); return; }
    c.p.onToggle();
  };
  const mute = () => {
    if (muted) { setMuted(false); current.current.p.onVolume(rememberedVolume.current); }
    else { rememberedVolume.current=physicalVolume.current; setMuted(true); current.current.p.onVolume(0); }
  };
  const operations = useRef({tune,pressTune,volume,mute}); operations.current={tune,pressTune,volume,mute};
  useEffect(()=>{tunedStationId.current=p.station?.id||null;setPreview(null);},[p.station?.id]);
  useEffect(()=>()=>clearTimeout(volumeTimer.current),[]);
  useEffect(()=>{view.current?.volume(physicalVolume.current);},[p.volume,ready,muted]);

  useEffect(()=>{
    const element=host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"high-performance"}); } catch {setFailed(true);return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=.95; renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.VSMShadowMap;
    element.appendChild(renderer.domElement);
    const scene=new THREE.Scene(), {device,parts,knobs,speaker}=createRadioModel(); scene.add(device);
    const camera=new THREE.PerspectiveCamera(32,1,.02,40);
    let atHome=true;
    const homeDistance=()=>Math.max(2.72,1.05/(Math.tan(THREE.MathUtils.degToRad(16))*camera.aspect));
    camera.position.set(.34,.22,homeDistance());
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.target.set(0,0,0);controls.enableDamping=true;controls.enablePan=false;
    controls.minDistance=1.3;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*.68;controls.update();
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment(), environment=pmrem.fromScene(room);
    scene.environment=environment.texture;scene.environmentIntensity=.7;
    scene.add(new THREE.HemisphereLight(0xffffff,0x858678,.7));
    const light=new THREE.DirectionalLight(0xfff8e9,2.2);light.position.set(-3,5,3);light.castShadow=true;
    light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.5,far:12});
    light.shadow.normalBias=.015;light.shadow.bias=-.0001;light.shadow.radius=4;light.shadow.blurSamples=8;scene.add(light);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.22,color:0x45503c}));
    floor.rotation.x=-Math.PI/2;floor.position.y=RADIO_FLOOR;floor.receiveShadow=true;scene.add(floor);
    const css=new CSS3DRenderer();css.domElement.className="native-css-scene";css.domElement.style.visibility="hidden";element.appendChild(css.domElement);
    screenElement.className="native-glass";
    const cssScene=new THREE.Scene(), screenObject=new CSS3DObject(screenElement);
    screenObject.position.set(RADIO_SCREEN.x,RADIO_SCREEN.y,RADIO_SCREEN.z);screenObject.scale.setScalar(RADIO_SCREEN.width/900);cssScene.add(screenObject);
    let expansion=0,expansionGoal=0;
    const bounds=new THREE.Box3();
    const disposeTree=(object:THREE.Object3D)=>object.traverse(child=>{if(child instanceof THREE.Mesh){child.geometry.dispose();for(const m of Array.isArray(child.material)?child.material:[child.material]){Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();}}});
    css.domElement.style.visibility="visible";setReady(true);
    const aim=(position:[number,number,number],lookAt:[number,number,number])=>{
      const damping=controls.enableDamping;controls.enableDamping=false;
      camera.position.set(...position);controls.target.set(...lookAt);controls.update();
      controls.enableDamping=damping;
    };
    const reset=()=>{atHome=true;expansionGoal=0;aim([.34,.22,homeDistance()],[0,0,0]);};
    view.current={reset,focus:()=>{atHome=false;aim([.5646,.39,1.7],[.5646,.25,0]);},explode:value=>{atHome=false;expansionGoal=value?1:0;aim([1.5,.65,Math.max(3.8,homeDistance())],[0,0,.1]);},volume:value=>{knobs.volume.rotation.z=volumeAngle(value);},tune:delta=>{knobs.tune.rotation.z-=delta*TUNING_DETENT;}};
    const ray=new THREE.Raycaster();
    const hit=(e:PointerEvent|WheelEvent)=>{const r=element.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);let object:THREE.Object3D|undefined=ray.intersectObjects(device.children,true)[0]?.object;while(object&&!object.userData.action&&object.parent!==device)object=object.parent||undefined;return object;};
    // Intersect a fixed plane in device coordinates, never the rotating knob's frame.
    const knobPoint=(e:PointerEvent,action:string)=>{
      hit(e);
      const knob=knobs[action],normal=new THREE.Vector3(0,0,1).applyQuaternion(device.quaternion);
      if(Math.abs(ray.ray.direction.dot(normal))<.16)return null;
      const center=device.localToWorld(knob.position.clone().add(new THREE.Vector3(0,0,.04)));
      const point=ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal,center),new THREE.Vector3());
      if(!point)return null;
      device.worldToLocal(point).sub(knob.position);
      if(Math.hypot(point.x,point.y)<(action==="tune"?.183:.065)*.25)return null;
      return Math.atan2(point.y,point.x);
    };
    let gesture:{id:number;x:number;y:number;lastX:number;lastY:number;action:string;value:number;angle:number;lastAngle:number|null;circular:boolean;arc:number;steps:number;moved:boolean}|null=null;
    const pressMotion:Record<string,PressMotion>={power:{depth:0,velocity:0,pulse:0},tune:{depth:0,velocity:0,pulse:0},volume:{depth:0,velocity:0,pulse:0}};
    const release=()=>{
      if(gesture?.action==="tune")knobs.tune.rotation.z=gesture.angle-gesture.steps*TUNING_DETENT;
      gesture=null;controls.enabled=true;
    };
    const down=(e:PointerEvent)=>{
      if(e.button!==0||gesture)return;
      const action=hit(e)?.userData.action||"body";
      if(action==="body"){renderer.domElement.focus();return;}
      e.preventDefault();e.stopImmediatePropagation();controls.enabled=false;
      renderer.domElement.setPointerCapture(e.pointerId);
      const angle=(action==="tune"||action==="volume")?knobPoint(e,action):null;
      gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,action,value:physicalVolume.current,angle:knobs[action]?.rotation.z||0,lastAngle:angle,circular:angle!==null,arc:0,steps:0,moved:false};
      renderer.domElement.style.cursor="pointer";
    };
    const move=(e:PointerEvent)=>{
      if(!gesture||gesture.id!==e.pointerId){renderer.domElement.style.cursor=hit(e)?.userData.action?"pointer":"grab";return;}
      e.preventDefault();e.stopImmediatePropagation();
      const g=gesture,dx=e.clientX-g.lastX,dy=e.clientY-g.lastY;
      g.moved ||= Math.hypot(e.clientX-g.x,e.clientY-g.y)>4;
      if(!g.moved)return;
      g.lastX=e.clientX;g.lastY=e.clientY;
      if(g.action==="volume"||g.action==="tune"){
        const angle=g.circular?knobPoint(e,g.action):null;
        const arc=g.circular?(angle!==null&&g.lastAngle!==null?clockwiseArc(g.lastAngle,angle):0):(dx-dy)*Math.PI/150;
        g.lastAngle=angle;
        if(g.action==="volume"){g.value=turnVolume(g.value,arc);operations.current.volume(g.value);}
        else{
          g.arc+=arc;const steps=detents(g.arc),delta=steps-g.steps;
          if(delta)operations.current.tune(delta);
          g.steps=steps;knobs.tune.rotation.z=g.angle-g.arc;
        }
      }
    };
    const up=(e:PointerEvent)=>{
      const active=gesture?.id===e.pointerId?gesture:null;
      if(active){pressMotion[active.action]=pulsePressMotion(pressMotion[active.action]);release();}
      if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
      renderer.domElement.style.cursor=hit(e)?.userData.action?"pointer":"grab";
      if(!active||active.moved)return;
      if(active.action==="power")current.current.p.onToggle();
      if(active.action==="tune")operations.current.pressTune();
      if(active.action==="screen")current.current.go("menu");
      if(active.action==="volume")operations.current.mute();
    };
    const wheel=(e:WheelEvent)=>{
      const action=hit(e)?.userData.action;
      if(action!=="volume"&&action!=="tune")return;
      e.preventDefault();e.stopImmediatePropagation();pressMotion[action]=pulsePressMotion(pressMotion[action]);
      if(action==="volume")operations.current.volume(physicalVolume.current-Math.sign(e.deltaY)*.025);
      else operations.current.tune(Math.sign(e.deltaY));
    };
    const cancel=(e:PointerEvent)=>{if(gesture?.id===e.pointerId)release();renderer.domElement.style.cursor="grab";};
    const key=(e:KeyboardEvent)=>{
      if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," ","Enter","m","M","Home"].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      if(e.key==="ArrowLeft"||e.key==="ArrowRight")operations.current.tune(e.key==="ArrowRight"?1:-1);
      else if(e.key==="ArrowUp"||e.key==="ArrowDown")operations.current.volume(physicalVolume.current+(e.key==="ArrowUp"?.025:-.025));
      else if(e.key===" ")current.current.p.onToggle();
      else if(e.key==="Enter")operations.current.pressTune();
      else if(e.key==="Home")reset();
      else operations.current.mute();
    };
    renderer.domElement.tabIndex=0;
    renderer.domElement.setAttribute("aria-label","收音机：左右键即时调台，Enter 播放暂停，上下键音量，M 静音，Home 恢复视角");
    const orbitStart=()=>{atHome=false;renderer.domElement.style.cursor="grabbing";};
    const orbitEnd=()=>{renderer.domElement.style.cursor="grab";};
    controls.addEventListener("start",orbitStart);controls.addEventListener("end",orbitEnd);
    renderer.domElement.addEventListener("keydown",key);
    renderer.domElement.addEventListener("pointerdown",down,true);renderer.domElement.addEventListener("pointermove",move,true);renderer.domElement.addEventListener("pointerup",up,true);renderer.domElement.addEventListener("pointercancel",cancel,true);renderer.domElement.addEventListener("lostpointercapture",cancel,true);renderer.domElement.addEventListener("wheel",wheel,{passive:false,capture:true});
    const resize=new ResizeObserver(()=>{const r=element.getBoundingClientRect();renderer.setSize(r.width,r.height);css.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(atHome){camera.position.set(.34,.22,homeDistance());controls.target.set(0,0,0);controls.update();}});resize.observe(element);
    let previousFrame=performance.now();
    let speakerMotion={level:0,phase:0};
    renderer.setAnimationLoop(time=>{
      const speed=reduced?1:.18,delta=Math.min(Math.max((time-previousFrame)/1000,0),.05);previousFrame=time;controls.update();
      expansion+=(expansionGoal-expansion)*speed;
      for(const action of ["power","tune","volume"]){pressMotion[action]=stepPressMotion(pressMotion[action],gesture?.action===action,delta,reduced);}
      for(const part of parts){part.mesh.position.copy(part.origin).addScaledVector(part.offset,expansion);for(const action of ["power","tune","volume"]){if(part.mesh===knobs[action])part.mesh.position.z-=pressMotion[action].depth;}}
      speakerMotion=stepSpeakerMotion(speakerMotion,delta,current.current.p.isPlaying&&!current.current.p.isLoading&&current.current.p.volume>0&&!document.hidden,current.current.p.volume,reduced);
      speaker.position.z+=speakerExcursion(speakerMotion,0);
      const powerMaterial=knobs.power.material as THREE.MeshStandardMaterial;
      powerMaterial.emissive.setHex(0x7a2c08);powerMaterial.emissiveIntensity=current.current.p.isPlaying?.16:pressMotion.power.pulse*.12;
      device.position.y=0;device.updateMatrixWorld(true);bounds.setFromObject(device);
      device.position.y=Math.max(0,RADIO_FLOOR-bounds.min.y);
      device.updateMatrixWorld(true);screenObject.position.copy(device.localToWorld(new THREE.Vector3(RADIO_SCREEN.x,RADIO_SCREEN.y,RADIO_SCREEN.z)));screenObject.quaternion.copy(device.quaternion);
      const facing=new THREE.Vector3(0,0,1).applyQuaternion(device.quaternion).dot(camera.position.clone().sub(screenObject.position).normalize());
      const visible=expansion<.02&&facing>.18;
      screenElement.style.visibility=visible?"visible":"hidden";screenElement.inert=!visible;
      renderer.render(scene,camera);css.render(cssScene,camera);
    });
    return()=>{view.current=null;resize.disconnect();renderer.setAnimationLoop(null);controls.removeEventListener("start",orbitStart);controls.removeEventListener("end",orbitEnd);controls.dispose();renderer.domElement.removeEventListener("keydown",key);renderer.domElement.removeEventListener("pointerdown",down,true);renderer.domElement.removeEventListener("pointermove",move,true);renderer.domElement.removeEventListener("pointerup",up,true);renderer.domElement.removeEventListener("pointercancel",cancel,true);renderer.domElement.removeEventListener("lostpointercapture",cancel,true);renderer.domElement.removeEventListener("wheel",wheel,true);disposeTree(scene);environment.dispose();room.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();css.domElement.remove();};
  },[screenElement]);

  const title=({now:"LIVE RADIO",menu:"乔木电台",stations:"电台列表",channels:"频道",favorites:"收藏",history:"收听历史",search:"搜索",support:"支持与关注",explore:"探索机身"})[menu];
  const start=Math.floor(selection/3)*3;
  const screenUI=<div className="native-screen-content" onKeyDown={e=>{if(e.target instanceof HTMLInputElement)return;if(e.key==="Escape"){go("now");view.current?.reset();}if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();tune(e.key==="ArrowDown"?1:-1);}}}>
    {menu==="now"?<button className="native-now" aria-label="打开机内菜单" onClick={()=>go("menu")}><span>{candidate?"调谐 · 正在切换":p.station?.name||"QIAOMU / RADIO"}</span><strong>{candidate?.name||track?.title||p.station?.name||"按橙色按钮，开始收听"}</strong><span>{muted?"静音 · 按音量旋钮恢复":adjustingVolume?`音量 ${Math.round(p.volume*100)}%${p.volume===0?" · 最小":p.volume===1?" · 最大":""}` : candidate?.country||track?.artist||"电台直播"}</span><small>{p.error||p.notice||(p.isLoading?"正在连接…":p.isPlaying?"● ON AIR":"Ⅱ STANDBY")}　{p.liked?"♥":""}　MENU ›</small></button>:<>
      <header><button aria-label="恢复原始视角" onClick={()=>{setExploded(false);go("now");view.current?.reset();}}><ZoomOut size={18}/></button><span>{title}</span><button aria-label="返回机内菜单" onClick={()=>go("menu")}>≡</button></header>
      {menu==="search"?<form onSubmit={e=>{e.preventDefault();p.onSearch(query.trim());go("stations");}}><input aria-label="电台名称" placeholder="电台名称…" value={query} onChange={e=>setQuery(e.target.value)}/><button>搜索</button></form>:menu==="support"?<SupportPanel/>:<div className="native-menu-rows" onWheel={e=>{e.stopPropagation();tune(Math.sign(e.deltaY));}}>{rows.slice(start,start+3).map((row,i)=><button key={row.id} aria-current={selection===start+i?"true":undefined} onFocus={()=>setSelection(start+i)} onClick={row.action}><span>{row.label}</span><span>›</span></button>)}{!rows.length&&<p>{p.isLoading?"正在寻找电台…":p.error||"暂无电台，返回选择频道"}</p>}</div>}
      {rows.length>3&&menu!=="search"&&menu!=="support"&&<nav><button aria-label="上一页电台菜单" disabled={selection<3} onClick={()=>setSelection(Math.max(0,selection-3))}>↑</button><span>{Math.floor(selection/3)+1}/{Math.ceil(rows.length/3)}</span><button aria-label="下一页电台菜单" disabled={start+3>=rows.length} onClick={()=>setSelection(Math.min(rows.length-1,selection+3))}>↓</button></nav>}
    </>}
  </div>;
  return <section className="native-radio" aria-label="博朗 3D 收音机">
    <div className="native-stage" ref={host}/>
    {failed?<div className="native-glass native-flat-screen">{screenUI}</div>:createPortal(screenUI,screenElement)}
    {!ready&&!failed&&<div className="native-loading" role="status" aria-label="正在载入博朗 3D 收音机"/>}
    <span className="native-sr" role="status">{p.error||(candidate?`正在切换到 ${candidate.name}`:`${p.isPlaying?"正在播放":"已暂停"} ${track?.title||p.station?.name||""}`)}</span>
  </section>;
}

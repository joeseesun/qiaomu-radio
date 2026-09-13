import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CSS3DObject, CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import type { PlayerProps } from "./PlayerSkin";
import type { NowPlaying } from "./useNowPlaying";
import { ModelLoader } from "./ModelLoader";
import { pulsePressMotion, stepPressMotion, type PressMotion } from "./radioPressFeedback";
import { bindFantasySpeakers } from "./fantasySurface";
import { stepSpeakerMotion, speakerExcursion } from "./fantasySpeakerMotion";
import { clockwiseArc, clampVolume, turnVolume } from "./radioGestures";
import { bindFantasyPress, fantasyActionAt, FANTASY_CONTROLS, FANTASY_SCREEN, normalizeFantasyModel, surfacePatch, surfacePoint, type FantasyAction } from "./fantasySurface";

type Page = "now" | "menu" | "channels" | "stations" | "favorites" | "history" | "search" | "info" | "support";
type Props = { player: PlayerProps; screen: ReactNode; page: string; open: (page: Page) => void; track: NowPlaying | null };
type SceneApi = { reset: () => void; menu: (open: boolean) => void };

export default function FantasyRadio({ player: p, screen, page, open, track }: Props) {
  const host = useRef<HTMLDivElement>(null), api = useRef<SceneApi | null>(null);
  const [screenElement] = useState(() => document.createElement("div"));
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [progress, setProgress] = useState(.04);
  const [panel, setPanel] = useState(false);
  const [muted, setMuted] = useState(false), remembered = useRef(p.volume);
  const current = useRef({ p, track, open, muted, panel }); current.current = { p, track, open, muted, panel };
  const physicalVolume = useRef(p.volume); physicalVolume.current = muted ? remembered.current : p.volume;
  const feedbackText = useRef({ text: "", until: 0 });
  const announce = (text: string) => { feedbackText.current = { text, until: Date.now() + 1500 }; };
  const volume = (value: number) => { const next = clampVolume(value); physicalVolume.current = next; setMuted(false); current.current.p.onVolume(next); announce(`音量 ${Math.round(next*100)}%${next===0?" · 最小":next===1?" · 最大":""}`); };
  const mute = () => { if(current.current.muted){setMuted(false);current.current.p.onVolume(remembered.current);announce("恢复声音");}else{remembered.current=physicalVolume.current;setMuted(true);current.current.p.onVolume(0);announce("已静音 · 再按恢复");} };
  const show = (next: Page) => { open(next); setPanel(true); };
  const actions = useRef({ volume, mute, show }); actions.current = { volume, mute, show };
  useEffect(() => { if(page === "now") setPanel(false); }, [page]);
  useEffect(() => { api.current?.menu(panel); }, [panel, ready]);
  useEffect(() => {
    const content=screenElement.querySelector<HTMLElement>(".screen-content");if(content)content.scrollTop=0;
    if(panel&&page==="search")screenElement.querySelector<HTMLInputElement>("input")?.focus({preventScroll:true});
    if(!panel&&screenElement.contains(document.activeElement))host.current?.querySelector("canvas")?.focus({preventScroll:true});
  }, [page,panel,screenElement]);
  useEffect(() => { if(muted&&p.volume>0)setMuted(false); }, [muted,p.volume]);
  useEffect(() => {
    const element = host.current!;
    let disposed=false, loaded=false, focused=false, atHome=true;
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:"high-performance" }); } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.95;
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap; element.appendChild(renderer.domElement);
    const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(32,1,.01,30);
    const homeDistance=()=>Math.max(4.1,1.63/(Math.tan(THREE.MathUtils.degToRad(16))*camera.aspect));
    camera.position.set(0,.25,4.1);
    const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(0,.20,0); controls.enableDamping=true; controls.enablePan=false;
    controls.minDistance=1; controls.maxDistance=10; controls.maxPolarAngle=Math.PI*.68;
    const pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment(), environment=pmrem.fromScene(room);
    scene.environment=environment.texture; scene.environmentIntensity=.75; scene.add(new THREE.HemisphereLight(0xe2eaff,0x30221b,.7));
    const light=new THREE.DirectionalLight(0xffe2ae,2); light.position.set(-3,5,4); light.castShadow=true;
    light.shadow.mapSize.set(1024,1024); Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.5,far:12}); light.shadow.bias=-.0002; light.shadow.normalBias=.003; scene.add(light);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.3})); floor.rotation.x=-Math.PI/2; floor.position.y=-.525; floor.receiveShadow=true; scene.add(floor);
    const device=new THREE.Group(); scene.add(device);
    let model: THREE.Object3D | null=null, deform: ReturnType<typeof bindFantasyPress> | null=null;
    let speakers: ReturnType<typeof bindFantasySpeakers> | null=null;
    let speakerMotion={level:0,phase:0};
    const initialVolume=physicalVolume.current;
    const canvas=document.createElement("canvas"); canvas.width=1200; canvas.height=438;
    const context=canvas.getContext("2d")!, texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
    let display: THREE.Mesh | null=null;
    const css=new CSS3DRenderer(); css.domElement.className="native-css-scene"; element.appendChild(css.domElement);
    screenElement.className="fantasy-glass"; screenElement.style.height=`${780*FANTASY_SCREEN.height/FANTASY_SCREEN.width}px`; const cssScene=new THREE.Scene(), menuObject=new CSS3DObject(screenElement);
    menuObject.scale.setScalar(FANTASY_SCREEN.width/780); cssScene.add(menuObject); screenElement.style.visibility="hidden";
    const feedback=new Map<string,{patch:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;motion:PressMotion}>();
    const maskCanvas=document.createElement("canvas");maskCanvas.width=maskCanvas.height=128;
    const maskContext=maskCanvas.getContext("2d")!;maskContext.fillStyle="black";maskContext.fillRect(0,0,128,128);
    const glow=maskContext.createRadialGradient(64,64,25,64,64,64);glow.addColorStop(0,"white");glow.addColorStop(1,"black");maskContext.fillStyle=glow;maskContext.fillRect(0,0,128,128);
    const mask=new THREE.CanvasTexture(maskCanvas);
    const disposeTree=(object:THREE.Object3D)=>object.traverse(child=>{if(child instanceof THREE.Mesh){child.geometry.dispose();for(const m of Array.isArray(child.material)?child.material:[child.material]){Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)v.dispose();});m.dispose();}}});
    new GLTFLoader().load("/models/qiaomu-fantasy-radio-hyper3d-v1.glb", gltf=>{
      if(disposed){disposeTree(gltf.scene);return;}
      try {
        model=gltf.scene; device.add(model); normalizeFantasyModel(model);
        model.traverse(child=>{if(child instanceof THREE.Mesh){child.castShadow=true;child.receiveShadow=true;}});
        const s=FANTASY_SCREEN;
        display=new THREE.Mesh(surfacePatch(model,s.x,s.y,s.width,s.height,32,.04),new THREE.MeshBasicMaterial({map:texture,toneMapped:false})); display.userData.action="screen"; device.add(display);
        menuObject.position.copy(surfacePoint(model,s.x,s.y)!).add(new THREE.Vector3(0,0,.002));
        for(const c of FANTASY_CONTROLS){
          const patch=new THREE.Mesh(surfacePatch(model,c.x,c.y,c.radius*1.5,c.radius*1.5,12),new THREE.MeshBasicMaterial({color:c.color,alphaMap:mask,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));
          device.add(patch);feedback.set(c.action,{patch,motion:{depth:0,velocity:0,pulse:0}});
        }
        device.updateMatrixWorld(true);
        // Include the surface glows so they follow the same weighted stroke as the buttons.
        deform=bindFantasyPress(device); speakers=bindFantasySpeakers(model); loaded=true;setProgress(1);setReady(true);
      } catch {setFailed(true);}
    },event=>{if(!disposed&&event.total>0)setProgress(Math.max(.04,Math.min(.98,event.loaded/event.total)));},()=>{if(!disposed)setFailed(true);});

    const cameraGoal=camera.position.clone(), targetGoal=controls.target.clone(); let framing=false;
    const frame=(position:THREE.Vector3,target:THREE.Vector3)=>{cameraGoal.copy(position);targetGoal.copy(target);framing=true;controls.enabled=false;};
    const reset=()=>{atHome=true;frame(new THREE.Vector3(0,.25,homeDistance()),new THREE.Vector3(0,.20,0));};
    const closeDistance=()=>Math.max(1.45,.60/(Math.tan(THREE.MathUtils.degToRad(16))*camera.aspect));
    api.current={reset,menu:value=>{
      focused=value;
      if(value){atHome=false;frame(new THREE.Vector3(FANTASY_SCREEN.x,FANTASY_SCREEN.y,closeDistance()),new THREE.Vector3(FANTASY_SCREEN.x,FANTASY_SCREEN.y,.235));}else reset();
    }};
    const ray=new THREE.Raycaster();
    const setRay=(e:PointerEvent|WheelEvent)=>{const r=element.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);};
    const hitAt=(e:PointerEvent|WheelEvent):FantasyAction|undefined=>{
      if(!loaded||!model)return;
      setRay(e);
      // Nearest real mesh wins: never click a front control through the rear enclosure.
      const hit=ray.intersectObjects(display?[model,display]:[model],true)[0];
      return hit ? hit.object===display?"screen":fantasyActionAt(hit.point) : undefined;
    };
    const knobAngle=(e:PointerEvent)=>{setRay(e);if(Math.abs(ray.ray.direction.z)<.16)return null;const c=FANTASY_CONTROLS[4],point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),-.459),new THREE.Vector3());if(!point||Math.hypot(point.x-c.x,point.y-c.y)<.025)return null;return Math.atan2(point.y-c.y,point.x-c.x);};
    const labels:Record<FantasyAction,string>={screen:"打开机内菜单",previous:"上一家电台",power:"播放 / 暂停",next:"下一家电台",favorite:"收藏电台",volume:"旋转调节音量 · 按下静音"};
    let gesture:{id:number;action:FantasyAction;x:number;y:number;lastX:number;lastY:number;angle:number|null;circular:boolean;value:number;moved:boolean;cancelled:boolean}|null=null;
    let hover:FantasyAction|undefined;
    const execute=(action:FantasyAction)=>{
      const player=current.current.p;announce(labels[action]);const f=feedback.get(action);if(f)f.motion=pulsePressMotion(f.motion);
      if(action==="screen")actions.current.show("menu");
      if(action==="power")player.onToggle();
      if(action==="previous")player.onPrevious();
      if(action==="next")player.onNext();
      if(action==="favorite"){if(player.station){player.onLike();announce(player.liked?"已取消收藏":"已收藏这家电台");}else announce("先选择一家电台");}
      if(action==="volume")actions.current.mute();
    };
    const down=(e:PointerEvent)=>{
      if(e.button!==0||gesture)return;
      const action=hitAt(e); if(!action||focused){atHome=false;return;}
      e.stopImmediatePropagation();e.preventDefault();framing=false;controls.enabled=false;
      const angle=action==="volume"?knobAngle(e):null;
      gesture={id:e.pointerId,action,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,angle,circular:angle!==null,value:physicalVolume.current,moved:false,cancelled:false};
      hover=action;renderer.domElement.setPointerCapture(e.pointerId);
      const f=feedback.get(action);if(f)f.motion={depth:.014,velocity:0,pulse:0};
    };
    const move=(e:PointerEvent)=>{
      if(!gesture){hover=hitAt(e);renderer.domElement.style.cursor=hover?hover==="volume"?"grab":"pointer":"grab";return;}
      if(gesture.id!==e.pointerId)return;
      const g=gesture;g.moved ||= Math.hypot(e.clientX-g.x,e.clientY-g.y)>4;
      if(g.action==="volume"&&g.moved){
        const angle=g.circular?knobAngle(e):null;
        const arc=g.circular?(angle!==null&&g.angle!==null?clockwiseArc(g.angle,angle):0):(e.clientX-g.lastX-e.clientY+g.lastY)*Math.PI/150;
        g.value=turnVolume(g.value,arc);actions.current.volume(g.value);g.angle=angle;g.lastX=e.clientX;g.lastY=e.clientY;
      }else if(g.moved||hitAt(e)!==g.action)g.cancelled=true;
    };
    const release=(e:PointerEvent,run:boolean)=>{
      if(!gesture||gesture.id!==e.pointerId)return;
      const g=gesture;gesture=null;controls.enabled=!focused&&!framing;
      if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
      if(run&&!g.cancelled&&!g.moved&&hitAt(e)===g.action)execute(g.action);
    };
    const up=(e:PointerEvent)=>release(e,true),cancel=(e:PointerEvent)=>release(e,false);
    const leave=()=>{if(!gesture)hover=undefined;};
    const wheel=(e:WheelEvent)=>{if(hitAt(e)!=="volume")return;e.preventDefault();e.stopImmediatePropagation();actions.current.volume(physicalVolume.current-Math.sign(e.deltaY)*.025);};
    const keyboard=(e:KeyboardEvent)=>{
      if(![" ","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","m","M","Enter","Home"].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      if(e.key==="Home")reset();else if(e.key==="Enter")actions.current.show("menu");else if(e.key==="ArrowUp"||e.key==="ArrowDown")actions.current.volume(physicalVolume.current+(e.key==="ArrowUp"?.025:-.025));else execute(e.key===" "?"power":e.key==="ArrowLeft"?"previous":e.key==="ArrowRight"?"next":"volume");
    };
    renderer.domElement.tabIndex=0;renderer.domElement.setAttribute("aria-label","魔兽世界 3D 收音机：空格播放，左右切台，上下音量，M 静音，Enter 菜单，Home 复位");
    renderer.domElement.addEventListener("pointerdown",down,true);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("pointercancel",cancel);renderer.domElement.addEventListener("lostpointercapture",cancel);renderer.domElement.addEventListener("pointerleave",leave);renderer.domElement.addEventListener("wheel",wheel,{passive:false,capture:true});renderer.domElement.addEventListener("keydown",keyboard);
    const resize=new ResizeObserver(()=>{const r=element.getBoundingClientRect();renderer.setSize(r.width,r.height);css.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(focused)api.current?.menu(true);else if(atHome)reset();});resize.observe(element);
    const motionPreference=matchMedia("(prefers-reduced-motion: reduce)");let lastFrame=0,lastText="";
    const draw=(lines:string[])=>{
      context.clearRect(0,0,1200,438);context.fillStyle="#10171b";context.beginPath();context.roundRect(0,0,1200,438,22);context.fill();
      const fit=(text:string,width:number)=>{let s=text;while(s.length>1&&context.measureText(s+"…").width>width)s=s.slice(0,-1);return s===text?s:s+"…";};
      context.fillStyle="#c5b594";context.font='500 37px -apple-system,"PingFang SC",sans-serif';context.fillText(fit(lines[0],1100),44,65);
      context.fillStyle="#f3e8ce";context.font='500 67px -apple-system,"PingFang SC",sans-serif';context.fillText(fit(lines[1],1100),44,162);
      context.fillStyle="#c5ced4";context.font='38px -apple-system,"PingFang SC",sans-serif';context.fillText(fit(lines[2],1100),44,238);
      context.fillStyle="#73858e";context.fillRect(44,281,1112,1);
      context.fillStyle="#e1c593";context.font='34px -apple-system,"PingFang SC",sans-serif';context.fillText(fit(lines[3],1100),44,343);
      context.fillStyle="#354047";context.fillRect(44,382,1112,8);context.fillStyle=current.current.muted?"#697279":"#d4ae67";context.fillRect(44,382,1112*physicalVolume.current,8);texture.needsUpdate=true;
    };
    renderer.setAnimationLoop(time=>{
      const reduced=motionPreference.matches;
      const delta=Math.min((time-lastFrame)/1000,.05);lastFrame=time;
      if(framing){const speed=reduced?1:1-Math.exp(-delta*16);camera.position.lerp(cameraGoal,speed);controls.target.lerp(targetGoal,speed);if(camera.position.distanceTo(cameraGoal)<.001&&controls.target.distanceTo(targetGoal)<.001){framing=false;controls.enabled=!focused;}}
      controls.update();
      const depths=new Map<string,number>();
      for(const [action,f] of feedback){
        const pressed=gesture?.action===action&&!gesture.cancelled;
        f.motion=stepPressMotion(f.motion,pressed,delta,reduced);depths.set(action,f.motion.depth);
        const active=action==="power"?current.current.p.isPlaying:action==="favorite"?current.current.p.liked:false;
        f.patch.material.opacity=pressed?.32:Math.min(.35,(active?.10:hover===action?.12:0)+f.motion.pulse*.25);
      }
      deform?.(depths,(initialVolume-physicalVolume.current)*Math.PI*1.5);
      const player=current.current.p, song=current.current.track;
      speakerMotion=stepSpeakerMotion(speakerMotion,delta,player.isPlaying&&!player.isLoading&&!current.current.muted&&!document.hidden,player.volume,reduced);
      speakers?.([speakerExcursion(speakerMotion,0),speakerExcursion(speakerMotion,1)]);
      const note=player.error||(feedbackText.current.until>Date.now()?feedbackText.current.text:hover?labels[hover]:player.notice||(current.current.muted?"静音 · 按音量旋钮恢复":"轻触黑玻璃，打开菜单"));
      const lines=[song?player.station?.name||"WORLD RADIO":player.station?`${player.station.country} · LIVE RADIO`:"QIAOMU / WORLD RADIO",song?.title||player.station?.name||"按蓝色宝石，开始收听",song?.artist||note,`${player.isLoading?"正在连接…":player.isPlaying?"● 正在直播":"Ⅱ 已暂停"}    ${current.current.muted?"静音":`音量 ${Math.round(player.volume*100)}%`}    ${player.liked?"♥ 已收藏":""}`];
      if(song&&(player.error||hover||feedbackText.current.until>Date.now()))lines[0]=note;
      const text=JSON.stringify(lines);if(text!==lastText){draw(lines);lastText=text;}
      if(display)display.visible=!focused;
      const facing=loaded&&camera.position.z>menuObject.position.z+.1;
      screenElement.style.visibility=focused&&facing?"visible":"hidden";screenElement.inert=!(focused&&facing);
      renderer.render(scene,camera);css.render(cssScene,camera);
    });
    return()=>{disposed=true;api.current=null;resize.disconnect();renderer.setAnimationLoop(null);controls.dispose();renderer.domElement.removeEventListener("pointerdown",down,true);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointercancel",cancel);renderer.domElement.removeEventListener("lostpointercapture",cancel);renderer.domElement.removeEventListener("pointerleave",leave);renderer.domElement.removeEventListener("wheel",wheel,true);renderer.domElement.removeEventListener("keydown",keyboard);disposeTree(scene);texture.dispose();mask.dispose();environment.dispose();room.dispose();pmrem.dispose();renderer.dispose();renderer.domElement.remove();css.domElement.remove();};
  }, [screenElement]);

  return <section className="rams-experience fantasy-experience" aria-label="魔兽世界 3D 收音机">
    <div className="rams-view" ref={host}/>
    {!ready&&!failed&&<ModelLoader fantasy progress={progress}/>}
    {failed&&<div className="fantasy-glass fantasy-flat-screen">{screen}</div>}
    {!failed&&createPortal(<div className="fantasy-menu" onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();setPanel(false);open("now");api.current?.reset();}}}>{screen}</div>,screenElement)}
    <span className="native-sr" role="status">{p.error||`${p.isPlaying?"正在播放":"已暂停"} ${track?.title||p.station?.name||""} · ${muted?"静音":`音量 ${Math.round(p.volume*100)}%`}${p.liked?" · 已收藏":""}`}</span>
  </section>;
}

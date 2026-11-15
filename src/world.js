import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Koi, KOI_VARIETIES } from './koi.js';
import { createAquascape } from './aquascape.js';

const LIGHT_PRESETS={
  dawn:{name:'FIRST LIGHT',sky:'#19353e',fog:'#25474a',sun:'#f3b79f',ambient:'#b3c2be',intensity:2.20,fill:1.45,beams:.65},
  day:{name:'GOLDEN HOUR',sky:'#0b2a33',fog:'#174047',sun:'#e7edcf',ambient:'#b1e3d4',intensity:2.70,fill:1.95,beams:1},
  dusk:{name:'EVENING TIDE',sky:'#122634',fog:'#203c47',sun:'#d99b83',ambient:'#9ba9ba',intensity:1.70,fill:1.23,beams:.47},
  night:{name:'MOONLIT WATER',sky:'#081727',fog:'#132b40',sun:'#8ca6ce',ambient:'#6a91bd',intensity:.63,fill:.60,beams:.18}
};

const geometryFood=new THREE.SphereGeometry(.034,8,6);
const materialFood=new THREE.MeshStandardMaterial({color:'#d0a56a',roughness:.82,metalness:0});

export class AquariumWorld {
  constructor(mount,options={}){
    this.mount=mount;
    this.onMetrics=options.onMetrics||(()=>{});
    this.onFishChange=options.onFishChange||(()=>{});
    this.clarity=THREE.MathUtils.clamp(options.clarity||91,50,100);
    this.mood=LIGHT_PRESETS[options.mood]?options.mood:'day';
    this.fish=[];this.food=[];this.selectedKoi=0;
    this.time=0;this.clock=new THREE.Clock();this.isRunning=true;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#09242d');
    this.scene.fog=new THREE.FogExp2('#174047',.028);
    this.camera=new THREE.PerspectiveCamera(39,1,.08,90);
    this.camera.position.set(0,4.7,11.4);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
    this.renderer.setClearColor('#0b242c');
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.26;
    this.renderer.shadowMap.enabled=false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<850?1.35:1.75));
    this.renderer.domElement.setAttribute('aria-label','Interactive 3D aquarium with swimming koi');
    this.renderer.domElement.tabIndex=0;
    mount.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.target.set(0,1.4,0);
    this.controls.enableDamping=true;this.controls.dampingFactor=.055;
    this.controls.enablePan=false;
    this.controls.minDistance=5.8;this.controls.maxDistance=24;
    this.controls.minPolarAngle=.40;this.controls.maxPolarAngle=1.63;
    this.controls.minAzimuthAngle=-.71;this.controls.maxAzimuthAngle=.71;
    this.controls.rotateSpeed=.57;this.controls.zoomSpeed=.75;
    this.controls.update();
    this.targetLook=null;
    this.ambient=new THREE.AmbientLight('#a1cabe',1.22);this.scene.add(this.ambient);
    this.hemi=new THREE.HemisphereLight('#d5f7e9','#2c493e',1.42);this.scene.add(this.hemi);
    this.sun=new THREE.DirectionalLight('#e7edcf',2.70);this.sun.position.set(-2.5,8,4.3);this.scene.add(this.sun);
    this.rim=new THREE.DirectionalLight('#79aac0',1.1);this.rim.position.set(4,3,-5);this.scene.add(this.rim);
    const topFill=new THREE.PointLight('#bfe3d7',12,14,2);topFill.position.set(-1,3.9,-.9);this.scene.add(topFill);
    this.topFill=topFill;
    this.aquascape=createAquascape(this.scene);
    this.setLight(this.mood,true);
    this.setClarity(this.clarity);
    const startCount=THREE.MathUtils.clamp(Math.round(options.count||4),1,KOI_VARIETIES.length);
    for(let i=0;i<startCount;i++)this.addKoi(false);
    this.onFishChange(this.fish.map(f=>({name:f.name,variety:f.variant.variety,base:f.variant.base,spot:f.variant.spots[0]})),this.selectedKoi);
    this.resize();
    this.boundResize=()=>this.resize();window.addEventListener('resize',this.boundResize);
    this.boundVisibility=()=>{if(document.hidden)this.clock.getDelta();};document.addEventListener('visibilitychange',this.boundVisibility);
    this.renderer.setAnimationLoop(()=>this.animate());
  }

  resize(){
    const w=Math.max(1,this.mount.clientWidth),h=Math.max(1,this.mount.clientHeight);
    this.camera.aspect=w/h;
    this.camera.fov=w<540?49:w<860?45:39;
    this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);
    if(!this.userMoved){
      this.camera.position.set(0,w<540?4.8:4.7,w<540?14.9:w<860?12.7:11.4);
      this.controls.target.set(0,1.43,0);
      this.controls.update();
    }
  }

  setLight(mode,immediate=false){
    if(!LIGHT_PRESETS[mode])return;
    this.mood=mode;this.targetPreset=LIGHT_PRESETS[mode];
    if(immediate){
      const v=this.targetPreset;
      this.scene.background.set(v.sky);this.scene.fog.color.set(v.fog);
      this.sun.color.set(v.sun);this.sun.intensity=v.intensity;
      this.hemi.color.set(v.ambient);this.hemi.intensity=v.fill;
      this.aquascape.setLightStrength(v.beams);
    }
    return this.targetPreset.name;
  }

  setClarity(value){
    this.clarity=THREE.MathUtils.clamp(Number(value),50,100);
    this.aquascape.setClarity(this.clarity);
    this.scene.fog.density=.011+((100-this.clarity)/100)*.09;
  }

  addKoi(notify=true){
    if(this.fish.length>=KOI_VARIETIES.length)return null;
    const koi=new Koi(this.fish.length,10528+this.fish.length*8021);
    this.scene.add(koi.group);this.fish.push(koi);
    if(notify){
      this.selectedKoi=this.fish.length-1;
      this.onFishChange(this.fish.map(f=>({name:f.name,variety:f.variant.variety,base:f.variant.base,spot:f.variant.spots[0]})),this.selectedKoi);
      this.emitMetrics();
    }
    return koi;
  }

  followFish(index){
    if(!this.fish[index])return;
    this.selectedKoi=index;
    const f=this.fish[index];
    this.targetLook=f.position.clone();
    this.targetLook.y+=.3;
    this.onFishChange(this.fish.map(o=>({name:o.name,variety:o.variant.variety,base:o.variant.base,spot:o.variant.spots[0]})),this.selectedKoi);
    setTimeout(()=>{this.targetLook=null;},2800);
  }

  resetCamera(){
    this.targetLook=null;this.userMoved=false;
    const w=this.mount.clientWidth;
    this.camera.position.set(0,w<540?4.8:4.7,w<540?14.9:w<860?12.7:11.4);
    this.controls.target.set(0,1.43,0);this.controls.update();
  }

  feed(){
    if(this.food.length>28)return false;
    const leader=this.fish[Math.floor(Math.random()*this.fish.length)];
    const cx=THREE.MathUtils.clamp((leader?.position.x??0)+(Math.random()-.5)*1.3,-3.9,3.9);
    const cz=THREE.MathUtils.clamp((leader?.position.z??0)+(Math.random()-.5)*1.0,-1.9,1.9);
    for(let i=0;i<12;i++){
      const mesh=new THREE.Mesh(geometryFood,materialFood);
      const px=cx+(Math.random()-.5)*1.7,pz=cz+(Math.random()-.5)*.9;
      mesh.position.set(px,3.02+Math.random()*.20,pz);
      this.scene.add(mesh);
      this.food.push({mesh,age:0,phase:Math.random()*6.28,sink:2.20+Math.random()*.4});
    }
    this.feedCount=(this.feedCount||0)+1;
    return true;
  }

  emitMetrics(){
    const fullness=this.fish.reduce((n,f)=>n+f.hunger,0)/Math.max(1,this.fish.length);
    const health=Math.round(Math.min(99,Math.max(62,94+(this.clarity-85)*.19+(fullness-78)*.075)));
    this.onMetrics({fishCount:this.fish.length,health,clarity:this.clarity,fullness:Math.round(fullness),feedCount:this.feedCount||0});
  }

  animate(){
    if(!this.isRunning)return;
    const dt=Math.min(.04,this.clock.getDelta());
    if(document.hidden)return;
    this.time+=dt;
    if(this.targetPreset){
      const p=this.targetPreset;
      this.scene.background.lerp(new THREE.Color(p.sky),dt*.55);
      this.scene.fog.color.lerp(new THREE.Color(p.fog),dt*.48);
      this.sun.color.lerp(new THREE.Color(p.sun),dt*.55);
      this.sun.intensity=THREE.MathUtils.damp(this.sun.intensity,p.intensity,1.1,dt);
      this.hemi.color.lerp(new THREE.Color(p.ambient),dt*.55);
      this.hemi.intensity=THREE.MathUtils.damp(this.hemi.intensity,p.fill,1.1,dt);
      this.aquascape.setLightStrength(p.beams);
      this.topFill.intensity=12*p.beams;
    }
    this.aquascape.update(this.time,dt);
    for(const pellet of this.food){
      pellet.age+=dt;
      const pos=pellet.mesh.position;
      pos.y=Math.max(pellet.sink,pos.y-dt*(.18+pellet.age*.025));
      pos.x+=Math.sin(this.time*1.6+pellet.phase)*dt*.015;
      pos.z+=Math.cos(this.time*1.4+pellet.phase)*dt*.012;
      pellet.mesh.rotation.y+=dt;
      pellet.mesh.scale.setScalar(.86+Math.sin(this.time*5+pellet.phase)*.08);
    }
    for(const f of this.fish){
      let nearest=null,dist=Infinity;
      for(const pellet of this.food){const d=f.position.distanceToSquared(pellet.mesh.position);if(d<dist){dist=d;nearest=pellet;}}
      const target=nearest?.mesh.position||null;
      f.update(dt,this.time,target,this.fish);
      if(nearest&&f.position.distanceTo(nearest.mesh.position)<.55){
        this.scene.remove(nearest.mesh);this.food.splice(this.food.indexOf(nearest),1);
        f.hunger=Math.min(100,f.hunger+1.5);
      }
    }
    // Clear pellets after 55s, preventing unbounded scene growth.
    for(let i=this.food.length-1;i>=0;i--)if(this.food[i].age>55){this.scene.remove(this.food[i].mesh);this.food.splice(i,1);}
    if(this.targetLook)this.controls.target.lerp(this.targetLook,Math.min(1,dt*1.6));
    this.controls.update();
    this.renderer.render(this.scene,this.camera);
    if(!this.lastMetrics||this.time-this.lastMetrics>1.5){this.lastMetrics=this.time;this.emitMetrics();}
  }

  snapshot(){
    this.renderer.render(this.scene,this.camera);
    const canvas=this.renderer.domElement;
    const data=canvas.toDataURL('image/png');
    const link=document.createElement('a');
    link.download=`stillwater-koi-${new Date().toISOString().slice(0,10)}.png`;
    link.href=data;link.click();
  }

  dispose(){
    this.isRunning=false;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize',this.boundResize);
    document.removeEventListener('visibilitychange',this.boundVisibility);
    this.controls.dispose();this.aquascape.dispose();this.fish.forEach(f=>f.dispose());
    for(const item of this.food)this.scene.remove(item.mesh);
    this.renderer.dispose();this.renderer.domElement.remove();
  }
}
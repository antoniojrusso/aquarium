import * as THREE from 'three';

// Every koi is modeled and textured at runtime. No downloaded fish assets are needed.
export const KOI_VARIETIES = [
  { name: 'Hikari', variety: 'Kohaku', base: '#f5e9cc', spots: ['#d95f35','#db723e','#e38152'], accent: '#d76e44' },
  { name: 'Sumi', variety: 'Showa', base: '#ede4cd', spots: ['#262c32','#d45c37','#252e33','#d76942'], accent: '#384249' },
  { name: 'Yuki', variety: 'Shiro Utsuri', base: '#e7e5d8', spots: ['#323940','#262e36','#455058'], accent: '#5a6463' },
  { name: 'Akane', variety: 'Taisho Sanke', base: '#f2e7d2', spots: ['#cc5834','#d76b3d','#323a40'], accent: '#c46943' },
  { name: 'Kin', variety: 'Yamabuki Ogon', base: '#dcb968', spots: ['#e1c377','#bd9248','#f1d994'], accent: '#e5c57d' },
  { name: 'Mizu', variety: 'Asagi', base: '#c8d6d1', spots: ['#658b93','#477987','#cf765b'], accent: '#7caaa8' },
  { name: 'Kumo', variety: 'Tancho', base: '#eee6d8', spots: ['#d26241','#e1d9c7'], accent: '#e7dfcc' }
];

function randomSequence(seed) {
  let n = seed >>> 0;
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296; };
}

function drawPatch(ctx, x, y, w, h, color, rand, alpha=1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 13;
  ctx.beginPath();
  const steps=19;
  for(let i=0;i<=steps;i++) {
    const a=i/steps*Math.PI*2;
    const stagger=.79+rand()*.37;
    const px=x+Math.cos(a)*w*stagger;
    const py=y+Math.sin(a)*h*stagger;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();ctx.fill();ctx.restore();
}

function makeKoiTexture(variant, seed) {
  const canvas=document.createElement('canvas');
  canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d');
  const r=randomSequence(seed*411+33);
  const grad=c.createLinearGradient(0,0,0,512);
  grad.addColorStop(0,'#b1b6ac');grad.addColorStop(.15,variant.base);grad.addColorStop(.5,variant.base);grad.addColorStop(.85,variant.base);grad.addColorStop(1,'#b1b6ac');
  c.fillStyle=grad;c.fillRect(0,0,1024,512);
  // Soft regional color fields create the distinctive, asymmetric koi markings.
  if (variant.name==='Kumo') {
    drawPatch(c,830,251,85,68,variant.spots[0],r,.95);
  } else if(variant.name==='Kin') {
    for(let i=0;i<23;i++)drawPatch(c,65+r()*870,65+r()*390,18+r()*44,14+r()*27,variant.spots[i%3],r,.10);
  } else {
    const placements=[.17,.31,.47,.63,.79,.87];
    placements.forEach((p,i)=>{
      if(r()<.13)return;
      const col=variant.spots[i%variant.spots.length];
      const x=(p+(r()-.5)*.065)*1024;
      const mid=(.22+r()*.12)*512;
      drawPatch(c,x,mid,47+r()*62,34+r()*60,col,r,.88+r()*.12);
      if(r()>.33)drawPatch(c,x+(r()-.5)*39,512-mid,29+r()*61,26+r()*59,col,r,.91);
    });
  }
  // Scale microstructure and fine pigment flecking are intentionally subtle.
  for(let i=0;i<8000;i++){
    const x=r()*1024,y=r()*512;
    c.fillStyle=r()>.48?'rgba(255,255,241,.035)':'rgba(40,60,53,.025)';
    c.beginPath();c.ellipse(x,y,.8+r()*2,.5+r()*1.2,0,0,Math.PI*2);c.fill();
  }
  c.lineWidth=.7;
  for(let j=20;j<1024;j+=16){
    for(let k=12;k<510;k+=15){
      c.strokeStyle='rgba(69,79,64,.063)';
      c.beginPath();c.arc(j+((Math.floor(k/15)%2)*8),k,7.5,Math.PI*.12,Math.PI*.9);c.stroke();
    }
  }
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=8;
  return tex;
}

function createBodyGeometry() {
  const geometry=new THREE.BufferGeometry();
  const positions=[],uvs=[],indices=[];
  const rings=42,sides=30,len=1.89;
  for(let i=0;i<=rings;i++){
    const t=i/rings;
    const fullness=Math.pow(Math.max(0,Math.sin(Math.PI*(t*.955+.027))),.75)*(.75+t*.25);
    const h=(.018+.31*fullness)*(1+.13*Math.sin(t*Math.PI));
    const w=.018+.218*fullness;
    const chest=t>.72?-.013:0;
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2;
      positions.push((t-.5)*len,Math.sin(a)*h+chest,Math.cos(a)*w);
      uvs.push(t,j/sides);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
    const a=i*(sides+1)+j,b=(i+1)*(sides+1)+j;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();
  return geometry;
}
const BODY_GEOMETRY=createBodyGeometry();
const EYE_GEOMETRY=new THREE.SphereGeometry(.045,12,10);
const GLINT_GEOMETRY=new THREE.SphereGeometry(.014,8,6);
const EYE_MATERIAL=new THREE.MeshPhysicalMaterial({color:'#0c1519',metalness:.28,roughness:.11,clearcoat:1});
const GLINT_MATERIAL=new THREE.MeshBasicMaterial({color:'#ffffff'});

function meshFromShape(shape,mat){const g=new THREE.ShapeGeometry(shape,12);const m=new THREE.Mesh(g,mat);m.renderOrder=3;return m;}
function lineThrough(points,material,radius=.006){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,4,false),material);}

export class Koi {
  constructor(index,seed=Math.floor(Math.random()*100000)) {
    this.index=index;
    this.variant=KOI_VARIETIES[index%KOI_VARIETIES.length];
    this.seed=seed;
    this.rand=randomSequence(seed);
    this.name=this.variant.name;
    this.group=new THREE.Group();
    this.group.name=`Koi — ${this.name}`;
    this.group.userData.koi=this;
    this.size=.88+this.rand()*.26;
    this.group.scale.setScalar(this.size);
    const texture=makeKoiTexture(this.variant,seed);
    this.texture=texture;
    const skin=new THREE.MeshPhysicalMaterial({map:texture,color:0xffffff,metalness:.035,roughness:.36,clearcoat:.82,clearcoatRoughness:.17,side:THREE.DoubleSide});
    this.body=new THREE.Mesh(BODY_GEOMETRY,skin);
    this.body.castShadow=true;
    this.group.add(this.body);
    this.skin=skin;
    this.bendUniforms=null;
    this.body.onBeforeCompile=(shader)=>{
      shader.uniforms.uKoiPhase={value:0};
      shader.uniforms.uKoiBend={value:.09};
      shader.vertexShader='uniform float uKoiPhase;\nuniform float uKoiBend;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed.z += sin((1.0-uv.x)*5.4+uKoiPhase) * pow(1.0-uv.x,1.8) * uKoiBend;`);
      this.bendUniforms=shader.uniforms;
    };
    const finMat=new THREE.MeshPhysicalMaterial({color:new THREE.Color(this.variant.base).lerp(new THREE.Color(this.variant.accent),.15),transparent:true,opacity:.82,roughness:.45,metalness:.02,side:THREE.DoubleSide,depthWrite:false,clearcoat:.7});
    const finVein=new THREE.MeshBasicMaterial({color:new THREE.Color(this.variant.accent).lerp(new THREE.Color('#ede7d5'),.5),transparent:true,opacity:.32,depthWrite:false});
    const dorsal=new THREE.Shape();
    dorsal.moveTo(-.53,.13);dorsal.bezierCurveTo(-.37,.34,-.25,.46,.06,.47);dorsal.bezierCurveTo(.22,.48,.35,.34,.48,.19);dorsal.lineTo(-.53,.13);
    const dorsalMesh=meshFromShape(dorsal,finMat);
    dorsalMesh.position.z=0;
    this.group.add(dorsalMesh);
    for(let i=0;i<5;i++){
      const x=-.40+i*.16;
      this.group.add(lineThrough([[x,.27,0],[x+.06,.34,0],[x+.16,.41-i*.015,0]],finVein,.0035));
    }
    const tailPivot=new THREE.Group();tailPivot.position.x=-.91;
    const tail=new THREE.Shape();
    tail.moveTo(0,0);tail.bezierCurveTo(-.19,.13,-.35,.36,-.58,.36);tail.bezierCurveTo(-.44,.13,-.40,.05,-.39,0);tail.bezierCurveTo(-.43,-.10,-.48,-.20,-.58,-.36);tail.bezierCurveTo(-.31,-.36,-.18,-.14,0,0);
    tailPivot.add(meshFromShape(tail,finMat));
    for(let i=-2;i<=2;i++)tailPivot.add(lineThrough([[0,0,.005],[-.20,i*.037,.005],[-.50,i*.13,.005]],finVein,.003));
    this.group.add(tailPivot);this.tail=tailPivot;
    // Paired translucent pectoral and pelvic fins.
    this.pectoralFins=[];
    for(const sign of [-1,1]){
      const p=new THREE.Shape();
      p.moveTo(.38,sign*.14);p.bezierCurveTo(.23,sign*.28,.11,sign*.55,-.18,sign*.62);
      p.bezierCurveTo(-.04,sign*.36,.1,sign*.15,.38,sign*.14);
      const fin=meshFromShape(p,finMat);fin.rotation.x=-Math.PI/2;fin.position.y=-.07;
      // ShapeGeometry is in XY, rotated to sit within XZ.
      this.group.add(fin);
      this.pectoralFins.push({mesh:fin,sign});
      const pelvic=new THREE.Shape();pelvic.moveTo(-.45,sign*.08);pelvic.quadraticCurveTo(-.58,sign*.34,-.78,sign*.36);pelvic.quadraticCurveTo(-.65,sign*.08,-.45,sign*.08);
      const pelvis=meshFromShape(pelvic,finMat);pelvis.rotation.x=-Math.PI/2;pelvis.position.y=-.13;this.group.add(pelvis);
      const eye=new THREE.Mesh(EYE_GEOMETRY,EYE_MATERIAL);eye.position.set(.66,.11,sign*.145);eye.scale.set(.80,.80,.55);this.group.add(eye);
      const glint=new THREE.Mesh(GLINT_GEOMETRY,GLINT_MATERIAL);glint.position.set(.682,.124,sign*.173);glint.scale.set(.65,.7,.7);this.group.add(glint);
      const gillMat=new THREE.MeshBasicMaterial({color:'#806f5d',transparent:true,opacity:.33});
      this.group.add(lineThrough([[.43,.19,sign*.12],[.39,.08,sign*.207],[.42,-.07,sign*.194]],gillMat,.004));
      const barbMat=new THREE.MeshPhysicalMaterial({color:this.variant.base,roughness:.65});
      this.group.add(lineThrough([[.88,-.04,sign*.039],[.99,-.07,sign*.10],[1.01,-.14,sign*.15]],barbMat,.007));
    }
    const lip=new THREE.Mesh(new THREE.SphereGeometry(.063,10,8),skin);lip.position.set(.917,-.031,0);lip.scale.set(.55,.28,.92);this.group.add(lip);
    this.position=new THREE.Vector3((this.rand()-.5)*5,1.15+this.rand()*1.5,(this.rand()-.5)*2.3);
    this.velocity=new THREE.Vector3((this.rand()-.5)*.7,(this.rand()-.5)*.05,(this.rand()-.5)*.5).normalize().multiplyScalar(.25);
    this.phase=this.rand()*Math.PI*2;
    this.speed=.33+this.rand()*.16;
    this.heading=this.rand()*Math.PI*2;
    this.hunger=65+this.rand()*28;
    this.age=0;
    this.group.position.copy(this.position);
  }

  update(dt, time, feedTarget, neighbors=[]) {
    this.age+=dt;
    // Koi are unhurried; steering is continuous rather than teleporting between waypoints.
    const wander=new THREE.Vector3(
      Math.cos(time*.31+this.phase*2.2)*1.1+Math.cos(time*.13+this.phase),
      Math.sin(time*.57+this.phase)*.36 + (1.50-this.position.y)*.8,
      Math.sin(time*.25+this.phase*1.1)+Math.sin(time*.41+this.phase)*.42
    );
    const steer=wander.multiplyScalar(.45);
    const margin=3.8;
    if(this.position.x>margin)steer.x-=(this.position.x-margin)*3+1;
    if(this.position.x < -margin)steer.x+=(-margin-this.position.x)*3+1;
    if(this.position.z>1.95)steer.z-=(this.position.z-1.95)*3+1;
    if(this.position.z < -1.95)steer.z+=(-1.95-this.position.z)*3+1;
    if(this.position.y>2.75)steer.y-=2.0;
    if(this.position.y<.65)steer.y+=2.0;
    for(const fish of neighbors){
      if(fish===this)continue;
      const v=this.position.clone().sub(fish.position);const d=v.lengthSq();
      if(d>0.0001&&d<1.65)steer.addScaledVector(v,(1.65-d)/d*.14);
    }
    if(feedTarget){
      const to=feedTarget.clone().sub(this.position);
      steer.addScaledVector(to,2.6);
      if(to.length()<1.0)steer.y+=.10;
    }
    const desired=steer.normalize().multiplyScalar(this.speed*(feedTarget?1.8:1));
    this.velocity.lerp(desired,Math.min(1,dt*(feedTarget?1.30:.66)));
    this.position.addScaledVector(this.velocity,dt);
    this.position.x=THREE.MathUtils.clamp(this.position.x,-4.7,4.7);
    this.position.y=THREE.MathUtils.clamp(this.position.y,.6,2.95);
    this.position.z=THREE.MathUtils.clamp(this.position.z,-2.37,2.37);
    const newHeading=Math.atan2(-this.velocity.z,this.velocity.x);
    let diff=Math.atan2(Math.sin(newHeading-this.heading),Math.cos(newHeading-this.heading));
    this.heading+=THREE.MathUtils.clamp(diff,-dt*1.25,dt*1.25);
    const pitch=THREE.MathUtils.clamp(Math.atan2(this.velocity.y,Math.hypot(this.velocity.x,this.velocity.z)),-.19,.19);
    this.group.position.copy(this.position);
    this.group.position.y+=Math.sin(time*2+this.phase)*.018;
    this.group.rotation.set(Math.sin(time*1.6+this.phase)*.022,this.heading,-pitch);
    this.tail.rotation.y=Math.sin(time*7.3+this.phase)*(.18+(feedTarget?.11:0));
    this.tail.rotation.z=Math.sin(time*7.3+this.phase)*.02;
    for(const fin of this.pectoralFins)fin.mesh.rotation.y=Math.sin(time*5.1+this.phase+(fin.sign>0?Math.PI:0))*.16;
    if(this.bendUniforms){this.bendUniforms.uKoiPhase.value=time*7.3+this.phase;this.bendUniforms.uKoiBend.value=feedTarget?.15:.105;}
    this.hunger=Math.max(0,this.hunger-dt*.004);
  }

  dispose(){this.texture.dispose();this.skin.dispose();this.group.traverse(x=>{if(x.geometry&&x.geometry!==BODY_GEOMETRY&&x.geometry!==EYE_GEOMETRY&&x.geometry!==GLINT_GEOMETRY)x.geometry.dispose();});}
}
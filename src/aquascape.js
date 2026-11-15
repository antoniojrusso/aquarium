import * as THREE from 'three';

const randFactory=(seed)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const prng=randFactory(42612);

function createSandTexture() {
  const c=document.createElement('canvas');c.width=c.height=512;
  const ctx=c.getContext('2d');ctx.fillStyle='#374e47';ctx.fillRect(0,0,512,512);
  for(let i=0;i<18000;i++){
    const l=15+prng()*38;
    ctx.fillStyle=`rgba(${Math.round(l+20)},${Math.round(l+30)},${Math.round(l+25)},${.13+prng()*.43})`;
    ctx.beginPath();ctx.ellipse(prng()*512,prng()*512,prng()*2.4+.25,prng()*1.5+.2,prng()*3,0,Math.PI*2);ctx.fill();
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,3);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}

function rockGeometry(radius) {
  const geo=new THREE.IcosahedronGeometry(radius,1);
  const arr=geo.attributes.position;
  for(let i=0;i<arr.count;i++) {
    const x=arr.getX(i),y=arr.getY(i),z=arr.getZ(i);
    const n=.85+prng()*.30;
    arr.setXYZ(i,x*n,y*(.70+prng()*.20),z*n);
  }
  geo.computeVertexNormals();return geo;
}

function makeLeaf(height,width,seed) {
  const pos=[],colors=[],uvs=[],idx=[];const rows=15;
  for(let j=0;j<=rows;j++) {
    const u=j/rows;
    const thick=Math.pow(Math.sin(Math.PI*u),.79)*width+.004;
    const arch=Math.pow(u,1.65)*(.13+height*.09);
    for(let s of [-1,1]){
      pos.push(arch+s*thick,u*height,Math.sin(u*Math.PI*1.2+seed)*.12*u+Math.cos(seed)*.09*u);
      const col=new THREE.Color('#254f43').lerp(new THREE.Color('#82ad74'),Math.sin(u*Math.PI)*.7+.08+prng()*.13);
      colors.push(col.r,col.g,col.b);uvs.push((s+1)/2,u);
    }
  }
  for(let j=0;j<rows;j++){const i=j*2;idx.push(i,i+1,i+2,i+1,i+3,i+2);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}

function waterSurfaceMaterial(){return new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uOpacity:{value:.42},uTint:{value:new THREE.Color('#86d7cc')}},
  vertexShader:`uniform float uTime; varying vec2 vUv; varying vec3 vWorld; void main(){vUv=uv; vec3 p=position; p.z+=sin(p.x*2.9+uTime*.72)*.042+cos(p.y*4.2-uTime*.53)*.027; vec4 world=modelMatrix*vec4(p,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`uniform float uTime; uniform float uOpacity; uniform vec3 uTint; varying vec2 vUv; varying vec3 vWorld;
    void main(){vec2 p=vUv*vec2(24.,12.);float a=sin(p.x+sin(p.y*.74+uTime*.4)*2.+uTime*.85);float b=cos(p.y*1.65+sin(p.x*.45-uTime*.55)*1.6-uTime*.55);float glint=pow(max(0.,a*b),14.);float wave=smoothstep(.76,1.,a*b);vec3 viewDir=normalize(cameraPosition-vWorld);float fresnel=pow(1.-abs(dot(viewDir,vec3(0.,1.,0.))),3.);vec3 col=uTint*(.35+wave*.7)+vec3(.77,.92,.82)*glint*.85;float alpha=clamp((.035+fresnel*.18+wave*.045+glint*.17)*uOpacity,0.,.47);gl_FragColor=vec4(col,alpha);}`,
  transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.NormalBlending
});}

function causticMaterial(){return new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:.20}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float uTime;uniform float uStrength;varying vec2 vUv;
    void main(){vec2 p=vUv*vec2(13.,8.);float a=sin(p.x*2.1+sin(p.y*2.5+uTime*.39)*1.8+uTime*.4);float b=sin(p.y*2.2+sin(p.x*1.7-uTime*.48)*1.6-uTime*.27);float c=sin((p.x+p.y)*1.5+uTime*.2);float d=pow(max(0.,(a+b+c+3.)/6.),12.);float lines=smoothstep(.60,.95,d)*.85;gl_FragColor=vec4(.61,.94,.77,(lines+.012)*uStrength);}`,
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
});}

function glassMaterial(){return new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uStrength:{value:.6}},
  vertexShader:`varying vec3 vNormal;varying vec3 vWorld;varying vec2 vUv;void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`varying vec3 vNormal;varying vec3 vWorld;varying vec2 vUv;uniform float uTime;uniform float uStrength;void main(){vec3 ray=normalize(cameraPosition-vWorld);float f=pow(1.-abs(dot(normalize(vNormal),ray)),3.);float band=pow(max(0.,sin(vUv.x*3.14159*2.+uTime*.04)),30.)*.06;float shine=smoothstep(.996,1.,sin(vUv.x*35.+vUv.y*4.))*0.035;float alpha=(.01+f*.28+band+shine)*uStrength;gl_FragColor=vec4(.58,.83,.82,alpha);}`,
  transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending
});}

function createDriftwood(group,pointA,pointB,branchCount,materials){
  const a=new THREE.Vector3(...pointA),b=new THREE.Vector3(...pointB);
  const middle=a.clone().lerp(b,.52).add(new THREE.Vector3(0,.3,0));
  const path=new THREE.CatmullRomCurve3([a,middle,b]);
  const log=new THREE.Mesh(new THREE.TubeGeometry(path,18,.095,7,false),materials[0]);log.castShadow=true;group.add(log);
  for(let i=0;i<branchCount;i++){
    const from=path.getPoint(.26+prng()*.52);
    const end=from.clone().add(new THREE.Vector3((prng()-.4)*1.5,.3+prng()*.62,(prng()-.5)*1.0));
    const twig=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from,from.clone().lerp(end,.55).add(new THREE.Vector3(0,.12,0)),end]),9,.035+prng()*.017,5,false),materials[i%2]);group.add(twig);
  }
}

export function createAquascape(scene) {
  const world=new THREE.Group();world.name='Aquarium habitat';scene.add(world);
  const width=10.6,depth=5.55,height=3.28;
  const sandMap=createSandTexture();
  const sand=new THREE.Mesh(new THREE.BoxGeometry(width,.22,depth),new THREE.MeshStandardMaterial({map:sandMap,color:'#d3d2b3',roughness:1,metalness:0}));
  sand.position.y=-.10;sand.receiveShadow=true;world.add(sand);
  // Randomized pebbles add micro-scale structure without high-resolution downloads.
  const pebbleGeom=new THREE.IcosahedronGeometry(1,0);
  const pebbleColors=['#7e8980','#6a746f','#8a8d7b','#a4a78e','#455c5b','#586763'];
  const pebbleMaterials=pebbleColors.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.96}));
  const pebbleCount=340;
  const pebbleMesh=new THREE.InstancedMesh(pebbleGeom,pebbleMaterials[0],pebbleCount);
  const pebbleTransform=new THREE.Object3D();
  const colors=pebbleColors.map(c=>new THREE.Color(c));
  for(let i=0;i<pebbleCount;i++){
    pebbleTransform.position.set((prng()-.5)*(width-.3),.013+prng()*.025,(prng()-.5)*(depth-.3));
    pebbleTransform.rotation.set(prng()*3,prng()*6,prng()*3);
    pebbleTransform.scale.set(.02+prng()*.085,.012+prng()*.04,.02+prng()*.075);
    pebbleTransform.updateMatrix();pebbleMesh.setMatrixAt(i,pebbleTransform.matrix);
    pebbleMesh.setColorAt(i,colors[Math.floor(prng()*colors.length)]);
  }
  pebbleMesh.instanceMatrix.needsUpdate=true;pebbleMesh.instanceColor.needsUpdate=true;world.add(pebbleMesh);
  // Larger river stone features, asymmetrically clustered on the left and right.
  const rockMaterials=['#405b53','#5b6960','#67766c','#314c49','#59655d'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.94,flatShading:true}));
  const clusters=[[-3.8,-.9,20],[-3.3,1.2,14],[3.7,-1.1,23],[3.9,1.4,12],[-.7,-1.8,7]];
  const rocks=new THREE.Group();rocks.name='River rock formations';world.add(rocks);
  for(const [cx,cz,count] of clusters)for(let i=0;i<count;i++){
    const r=.16+prng()*.39;
    const stone=new THREE.Mesh(rockGeometry(r),rockMaterials[Math.floor(prng()*rockMaterials.length)]);
    stone.position.set(cx+(prng()-.5)*1.75,r*.4,cz+(prng()-.5)*1.3);
    stone.rotation.set(prng()*2,prng()*6,prng()*2);
    stone.scale.set(.8+prng()*.8,.45+prng()*.65,.78+prng()*.95);
    stone.castShadow=true;stone.receiveShadow=true;rocks.add(stone);
  }
  const woodMaterials=[new THREE.MeshStandardMaterial({color:'#594b3b',roughness:1}),new THREE.MeshStandardMaterial({color:'#76634c',roughness:.92})];
  createDriftwood(world,[-4.25,.09,-1.6],[-2.0,.5,-.7],7,woodMaterials);
  createDriftwood(world,[3.8,.08,1.7],[2.5,.75,.35],5,woodMaterials);
  const plantMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:0,side:THREE.DoubleSide,transparent:true,opacity:.93,depthWrite:true});
  const plantGroups=[];
  const plantSpots=[[-4.4,-1.8,16],[-3.6,1.8,14],[4.1,-1.6,18],[4.2,1.8,14],[-2.1,-2.25,8],[2.1,-2.12,9]];
  for(let h=0;h<plantSpots.length;h++) {
    const [px,pz,count]=plantSpots[h],bush=new THREE.Group();
    bush.position.set(px,.04,pz);world.add(bush);
    for(let i=0;i<count;i++) {
      const height=.38+prng()*1.45;
      const leaf=new THREE.Mesh(makeLeaf(height,.045+prng()*.13,prng()*6),plantMaterial);
      leaf.position.set((prng()-.5)*.28,0,(prng()-.5)*.28);
      leaf.rotation.y=prng()*Math.PI*2;leaf.rotation.z=(prng()-.5)*.33;
      leaf.userData.sway=prng()*Math.PI*2;
      leaf.userData.original=leaf.rotation.z;
      bush.add(leaf);plantGroups.push(leaf);
    }
  }
  // The water volume is suggested by fog, refraction, surface motion and caustic projection.
  const surfaceMat=waterSurfaceMaterial();
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(width,depth,50,24),surfaceMat);
  surface.rotation.x=-Math.PI/2;surface.position.y=height;surface.renderOrder=4;world.add(surface);
  const causticMat=causticMaterial();
  const caustics=new THREE.Mesh(new THREE.PlaneGeometry(width-.1,depth-.1),causticMat);
  caustics.rotation.x=-Math.PI/2;caustics.position.y=.021;caustics.renderOrder=2;world.add(caustics);
  const glassMat=glassMaterial();
  const front=new THREE.Mesh(new THREE.PlaneGeometry(width,height),glassMat);front.position.set(0,height/2,depth/2+.025);front.renderOrder=8;world.add(front);
  const sides=[];
  for(const x of [-width/2-.03,width/2+.03]) {
    const pane=new THREE.Mesh(new THREE.PlaneGeometry(depth,height),glassMat);
    pane.rotation.y=Math.PI/2;pane.position.set(x,height/2,0);pane.renderOrder=7;world.add(pane);sides.push(pane);
  }
  const back=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:'#15363b',transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
  back.position.set(0,height/2,-depth/2-.05);world.add(back);
  // Minimal graphite frame; thin edges imply real glass without hiding the view.
  const frameMat=new THREE.MeshStandardMaterial({color:'#3a5552',metalness:.67,roughness:.32});
  const glassEdges=new THREE.Group();world.add(glassEdges);
  function bar(x,y,z,sx,sy,sz,mat=frameMat){const obj=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);obj.position.set(x,y,z);glassEdges.add(obj);return obj;}
  for(const z of [-depth/2,depth/2])for(const x of [-width/2,width/2])bar(x,height/2,z,.035,height+.02,.035);
  for(const z of [-depth/2,depth/2])for(const y of [0,height])bar(0,y,z,width,.025,.035);
  for(const x of [-width/2,width/2])for(const y of [0,height])bar(x,y,0,.028,.028,depth);
  const baseMat=new THREE.MeshStandardMaterial({color:'#182a2b',metalness:.52,roughness:.4});
  bar(0,-.19,0,width+.24,.25,depth+.21,baseMat);
  const rimLightMat=new THREE.MeshBasicMaterial({color:'#72998c',transparent:true,opacity:.43});
  bar(0,-.042,depth/2+.12,width+.15,.009,.015,rimLightMat);
  // A few large, soft light shafts hint at suspended particles and water depth.
  const shaftMat=new THREE.MeshBasicMaterial({color:'#80c8ac',transparent:true,opacity:.038,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  for(const x of [-2.7,.4,3.1]){
    const shaft=new THREE.Mesh(new THREE.ConeGeometry(.82+prng()*.45,height,32,1,true),shaftMat);
    shaft.position.set(x,height/2+.2,-.4);shaft.rotation.z=(prng()-.5)*.28;world.add(shaft);
  }
  // Tiny bubbles are GPU-instanced; their individual drift is animated below.
  const bubbleGeo=new THREE.SphereGeometry(1,8,6);
  const bubbleMat=new THREE.MeshPhysicalMaterial({color:'#c1e6e2',metalness:.14,roughness:.07,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide});
  const bubbleCount=110,bubbles=new THREE.InstancedMesh(bubbleGeo,bubbleMat,bubbleCount);
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);world.add(bubbles);
  const bubbleItems=Array.from({length:bubbleCount},(_,i)=>({
    x:(i<bubbleCount/2?-3.9:3.7)+(prng()-.5)*.68,
    z:(i<bubbleCount/2?-1.6:1.4)+(prng()-.5)*.5,
    y:prng()*height,
    velocity:.15+prng()*.27,
    size:.008+prng()*.032,
    phase:prng()*Math.PI*2
  }));
  // Suspended motes help establish scale in a still, deep aquarium.
  const motePos=[];
  for(let i=0;i<260;i++)motePos.push((prng()-.5)*width,prng()*height,(prng()-.5)*depth);
  const moteGeo=new THREE.BufferGeometry();moteGeo.setAttribute('position',new THREE.Float32BufferAttribute(motePos,3));
  const motes=new THREE.Points(moteGeo,new THREE.PointsMaterial({color:'#dce9ce',size:.018,transparent:true,opacity:.33,depthWrite:false}));world.add(motes);
  const temp=new THREE.Object3D();
  function update(time,delta){
    surfaceMat.uniforms.uTime.value=time;
    causticMat.uniforms.uTime.value=time;
    glassMat.uniforms.uTime.value=time;
    for(let i=0;i<plantGroups.length;i++){const leaf=plantGroups[i];leaf.rotation.z=leaf.userData.original+Math.sin(time*.7+leaf.userData.sway)*.058;}
    for(let i=0;i<bubbleItems.length;i++){
      const b=bubbleItems[i];b.y+=delta*b.velocity;if(b.y>height+.1)b.y=-.06;
      temp.position.set(b.x+Math.sin(time*.8+b.phase)*.07,b.y,b.z+Math.cos(time*.7+b.phase)*.06);
      temp.scale.setScalar(b.size);temp.rotation.set(0,0,0);temp.updateMatrix();bubbles.setMatrixAt(i,temp.matrix);
    }
    bubbles.instanceMatrix.needsUpdate=true;
    motes.rotation.y=Math.sin(time*.06)*.003;
  }
  function setClarity(value){
    surfaceMat.uniforms.uOpacity.value=.24+(100-value)/300;
    glassMat.uniforms.uStrength.value=.6+(100-value)/240;
    causticMat.uniforms.uStrength.value=.22-(100-value)/900;
  }
  function setLightStrength(v){causticMat.uniforms.uStrength.value=v*.24;shaftMat.opacity=v*.038;}
  function dispose(){
    world.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];for(const m of mats)m.dispose();}});
    sandMap.dispose();
  }
  update(0,0);
  return{world,width,depth,height,update,setClarity,setLightStrength,dispose};
}
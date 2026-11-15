const $=(id)=>document.getElementById(id);
const STORAGE_KEY='stillwater-aquarium-v1';
const els={
  mount:$('render-target'),loader:$('loading-state'),roster:$('fish-roster'),count:$('fish-count'),
  score:$('habitat-score'),careFill:$('care-fill'),careMessage:$('care-message'),quality:$('water-quality'),
  clarity:$('clarity-input'),clarityLabel:$('clarity-label'),lightLabel:$('light-label'),
  toast:$('toast'),sound:$('sound-btn'),soundLabel:$('sound-label'),guide:$('guide')
};

function loadState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{return {}}}
const persisted=loadState();
function saveState(){
  if(!world)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({mood:world.mood,clarity:world.clarity,count:world.fish.length,lastVisit:Date.now()}));}catch{}
}
let world=null;
let toastTimer=null;
function toast(message){
  els.toast.textContent=message;els.toast.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>els.toast.classList.remove('show'),3100);
}

function updateRoster(koi,index){
  els.roster.replaceChildren();
  koi.forEach((fish,i)=>{
    const button=document.createElement('button');
    button.className='fish-chip'+(i===index?' selected':'');
    button.type='button';
    button.setAttribute('aria-label',`Follow ${fish.name}, ${fish.variety}`);
    button.setAttribute('aria-pressed',String(i===index));
    const avatar=document.createElement('span');avatar.className='fish-avatar';
    avatar.style.setProperty('--fish-color',fish.base);avatar.style.setProperty('--fish-patch',fish.spot);
    const words=document.createElement('span');words.className='fish-info';
    const name=document.createElement('strong');name.textContent=fish.name;
    const variety=document.createElement('small');variety.textContent=fish.variety;
    words.append(name,variety);button.append(avatar,words);
    button.addEventListener('click',()=>{world.followFish(i);toast(`Following ${fish.name} · ${fish.variety}`);});
    els.roster.append(button);
  });
  els.count.textContent=String(koi.length).padStart(2,'0')+' RESIDENT'+(koi.length===1?'':'S');
  $('add-fish-btn').disabled=koi.length>=7;
}

function updateMetrics(data){
  els.score.textContent=data.health+'%';
  els.careFill.style.width=data.health+'%';
  els.quality.innerHTML=`${data.health}<span>%</span>`;
  els.careMessage.textContent=data.fullness>67?'Your koi are thriving.':data.fullness>40?'Your koi could use a little food.':'Your koi would love a meal.';
}

function updateClarity(value){
  const v=Number(value);els.clarity.value=String(v);
  els.clarityLabel.textContent=v>=87?'CRYSTAL':v>=70?'BALANCED':'NATURAL';
  if(world){world.setClarity(v);saveState();}
}

function selectLight(mode,announce=true){
  const buttons=document.querySelectorAll('[data-light]');
  for(const button of buttons){
    const active=button.dataset.light===mode;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  }
  if(world){
    const label=world.setLight(mode);
    els.lightLabel.textContent=label;
    saveState();if(announce)toast(`Atmosphere: ${label.toLowerCase()}`);
  }
}

function feed(){if(!world)return;const success=world.feed();toast(success?'A little nourishment, a lot of joy.':'The koi have enough food for now.');}
function addKoi(){
  if(!world)return;
  const fish=world.addKoi();
  if(fish){toast(`${fish.name} the ${fish.variant.variety} has joined the sanctuary.`);saveState();}
  else toast('Your sanctuary is at its seven-koi capacity.');
}
function photo(){
  if(!world)return;
  try{world.snapshot();toast('Photograph saved to your device.');}
  catch{toast('Your browser could not save this photograph.');}
}

class AmbientWaterAudio{
  constructor(){this.ctx=null;this.source=null;this.gain=null;this.enabled=false;}
  async toggle(){
    if(this.enabled){this.stop();return false;}
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)throw new Error('Audio is unavailable');
    if(!this.ctx)this.ctx=new AC();
    await this.ctx.resume();
    const buffer=this.ctx.createBuffer(1,2*this.ctx.sampleRate,this.ctx.sampleRate);
    const ch=buffer.getChannelData(0);
    let last=0;
    for(let i=0;i<ch.length;i++){
      const white=Math.random()*2-1;
      last=(last+white*.015)/1.015;
      ch[i]=last*2.6;
    }
    const noise=this.ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
    const lowpass=this.ctx.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=310;lowpass.Q.value=.7;
    const volume=this.ctx.createGain();volume.gain.setValueAtTime(0,this.ctx.currentTime);
    volume.gain.linearRampToValueAtTime(.13,this.ctx.currentTime+1.6);
    noise.connect(lowpass);lowpass.connect(volume);volume.connect(this.ctx.destination);
    noise.start();this.source=noise;this.gain=volume;this.enabled=true;return true;
  }
  stop(){
    if(!this.ctx||!this.source)return;
    const s=this.source,g=this.gain;
    g.gain.cancelScheduledValues(this.ctx.currentTime);
    g.gain.setTargetAtTime(0,this.ctx.currentTime,.2);
    setTimeout(()=>{try{s.stop();s.disconnect();g.disconnect();}catch{}},850);
    this.source=null;this.gain=null;this.enabled=false;
  }
}
const ambience=new AmbientWaterAudio();
function updateAudioUI(on){
  els.sound.setAttribute('aria-pressed',String(on));
  els.soundLabel.textContent=on?'SOUND ON':'SOUND OFF';
  els.sound.classList.toggle('is-playing',on);
}

function showGuide(){els.guide.hidden=false;$('close-guide').focus();}
function hideGuide(){els.guide.hidden=true;$('help-btn').focus();}

$('feed-btn').addEventListener('click',feed);
$('add-fish-btn').addEventListener('click',addKoi);
$('photo-btn').addEventListener('click',photo);
$('reset-btn').addEventListener('click',()=>{world?.resetCamera();toast('A wider view of your sanctuary.');});
els.clarity.addEventListener('input',event=>updateClarity(event.target.value));
document.querySelectorAll('[data-light]').forEach(button=>button.addEventListener('click',()=>selectLight(button.dataset.light)));
els.sound.addEventListener('click',async()=>{
  try{const on=await ambience.toggle();updateAudioUI(on);toast(on?'Underwater ambience enabled.':'Underwater ambience muted.');}
  catch{toast('Sound is unavailable in this browser.');}
});
$('help-btn').addEventListener('click',showGuide);
$('close-guide').addEventListener('click',hideGuide);
$('guide-done').addEventListener('click',hideGuide);
els.guide.addEventListener('click',e=>{if(e.target===els.guide)hideGuide();});
document.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement||e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.key==='Escape'&&!els.guide.hidden){hideGuide();return;}
  if(!els.guide.hidden)return;
  if(e.key.toLowerCase()==='f')feed();
  if(e.key.toLowerCase()==='p')photo();
  if(e.key.toLowerCase()==='r')world?.resetCamera();
});

const storedMood=['dawn','day','dusk','night'].includes(persisted.mood)?persisted.mood:'day';
const storedClarity=Number.isFinite(Number(persisted.clarity))&&persisted.clarity!==undefined?Number(persisted.clarity):91;
updateClarity(storedClarity);
selectLight(storedMood,false);

async function start(){
  const canUseWebGL=!!document.createElement('canvas').getContext('webgl2');
  if(!canUseWebGL)throw new Error('This device does not support WebGL 2.');
  const { AquariumWorld }=await import('./world.js');
  world=new AquariumWorld(els.mount,{
    mood:storedMood,clarity:storedClarity,
    count:Number.isFinite(Number(persisted.count))?Number(persisted.count):4,
    onFishChange:updateRoster,onMetrics:updateMetrics
  });
  els.lightLabel.textContent=world.targetPreset.name;
  world.renderer.domElement.addEventListener('pointerdown',()=>{world.userMoved=true;},{passive:true});
  world.renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();toast('The graphics context was interrupted. Reload to reconnect.');
  });
  saveState();
  requestAnimationFrame(()=>requestAnimationFrame(()=>els.loader.classList.add('is-hidden')));
}

start().catch(error=>{
  console.error('Could not start Stillwater:',error);
  els.loader.innerHTML='';
  els.loader.classList.remove('is-hidden');
  const heading=document.createElement('p');heading.textContent='The water could not settle.';
  const detail=document.createElement('div');detail.style.cssText='max-width:340px;padding:0 24px;text-align:center;color:#b4c9c2;line-height:1.7';
  detail.textContent='The 3D scene could not load. Please check your internet connection and WebGL support, then refresh.';
  const retry=document.createElement('button');retry.className='action-btn primary';retry.textContent='RELOAD AQUARIUM';retry.addEventListener('click',()=>location.reload());
  els.loader.append(heading,detail,retry);
});

window.addEventListener('pagehide',()=>{ambience.stop();world?.dispose();});
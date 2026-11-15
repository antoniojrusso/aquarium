import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
const browser=await chromium.launch({
  headless:true,
  args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']
});
const failures=[];
await mkdir('artifacts',{recursive:true});

async function check(viewport,label){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  page.on('pageerror',e=>failures.push(label+': '+e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForSelector('#render-target canvas',{timeout:60000});
  await page.waitForFunction(()=>document.getElementById('loading-state')?.classList.contains('is-hidden'),null,{timeout:60000});
  await sleep(2000);
  const n=await page.locator('#fish-roster button').count();
  if(n!==4)throw new Error(label+': expected 4 resident koi, found '+n);
  await page.screenshot({path:'artifacts/'+label+'.png'});
  await page.locator('#feed-btn').click();
  await page.waitForFunction(()=>document.getElementById('toast')?.textContent.includes('nourishment'),null,{timeout:10000});
  await page.locator('[data-light="night"]').click();
  await page.waitForFunction(()=>document.getElementById('light-label')?.textContent==='MOONLIT WATER',null,{timeout:10000});
  await page.locator('#add-fish-btn').click();
  const newCount=await page.locator('#fish-roster button').count();
  if(newCount!==5)throw new Error(label+': add-koi action failed, count '+newCount);
  console.log(label+': 3D scene loaded, '+n+' koi visible in roster, feed + lighting + add-koi passed');
  await page.close();
}
try {
  await sleep(1200);
  await check({width:1440,height:900},'desktop');
  await check({width:390,height:844},'mobile');
  if(failures.length)throw new Error(failures.join('\n'));
  console.log('Stillwater visual smoke test passed.');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

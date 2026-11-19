const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const{createServer}=await import(process.cwd()+'/node_modules/vite/dist/node/index.js');
 const vite=await createServer({root:process.cwd(),cacheDir:'/tmp/verify-metronome-motion-vite',server:{host:'127.0.0.1',port:5204,strictPort:true,hmr:false}});await vite.listen();
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const rate=16000,seconds=12,wav=Buffer.alloc(44+rate*seconds*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<rate*seconds;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/rate)*1000),44+i*2);
  const html=`<html><body><div class="transcription-audio-tape"><audio src="data:audio/wav;base64,${wav.toString('base64')}" preload="auto"></audio></div><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;import React,{useState} from 'react';import{createRoot}from'react-dom/client';import Metronome from '/src/echo/Metronome3D.jsx';import Bpm from '/src/echo/BpmPicker.jsx';function App(){const[bpm,setBpm]=useState(120);return React.createElement('div',{className:'admin-workspace'},React.createElement('button',{onClick:()=>document.querySelector('audio').play()},'Play'),React.createElement(Metronome,{bpm,beatStart:0,audioUrl:'fixture.wav'}),React.createElement(Bpm,{value:bpm,onChange:setBpm,audioUrl:'fixture.wav'}))}createRoot(document.getElementById('root')).render(React.createElement(App));</script></body></html>`;
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__motion_qa__*',async r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/__motion_qa__',html)}):r.continue());await page.goto('http://127.0.0.1:5204/__motion_qa__');await page.waitForFunction(()=>document.querySelector('audio').readyState>=2);
  await page.getByRole('button',{name:'Play',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.metronome-arm').getAnimations().some(a=>a.playState==='running'));
  const motion=await page.evaluate(async()=>{
   const audio=document.querySelector('audio'),arm=document.querySelector('.metronome-arm'),swing=arm.getAnimations().find(a=>a.playState==='running');
   // Add clock drift, then verify sync corrects speed without repositioning the arm.
   swing.currentTime-=150;
   let writes=0;const descriptor=Object.getOwnPropertyDescriptor(Animation.prototype,'currentTime');Object.defineProperty(swing,'currentTime',{get(){return descriptor.get.call(this)},set(value){writes++;descriptor.set.call(this,value)}});
   const samples=[],began=performance.now();
   const notifications=setInterval(()=>audio.dispatchEvent(new Event('canplay')),200);
   await new Promise(resolve=>{const frame=()=>{const matrix=new DOMMatrix(getComputedStyle(arm).transform);samples.push({wall:performance.now(),audio:audio.currentTime,phase:swing.currentTime,angle:Math.atan2(matrix.b,matrix.a),state:swing.playState,rate:swing.playbackRate});if(performance.now()-began<6000)requestAnimationFrame(frame);else resolve()};requestAnimationFrame(frame)});clearInterval(notifications);
   return{samples,writes,paused:audio.paused,phase:swing.currentTime,audio:audio.currentTime};
  });
  assert.ok(motion.samples.length>60,'Measure continuous motion across multiple beats');assert.equal(motion.paused,false);assert.equal(motion.writes,0,'Readiness notifications and drift correction never reposition a running swing');
  assert.ok(motion.samples.every(s=>s.state==='running'),'Swing stays running throughout playback');
  let stalls=0;for(let i=0;i<motion.samples.length;i++){const a=motion.samples[i],b=motion.samples.find(s=>s.wall>=a.wall+100);if(!b)continue;const expectedSpeed=Math.abs(Math.sin((a.audio+b.audio)*Math.PI));if(b.audio-a.audio>.07&&expectedSpeed>.6&&Math.abs(b.angle-a.angle)<.003)stalls++;}assert.equal(stalls,0,'Arm keeps moving between beat extremes');
  const duration=1000,error=((motion.phase-motion.audio*1000)%duration+duration*1.5)%duration-duration/2;assert.ok(Math.abs(error)<60,`Drift converges smoothly: ${error.toFixed(1)}ms`);await page.getByRole('button',{name:'Clear the tempo',exact:true}).click({timeout:5000});await page.waitForFunction(()=>document.querySelector('.bpm-value input').value==='',{},{timeout:3000});
  const afterClear=await page.evaluate(async()=>{const audio=document.querySelector('audio'),time=audio.currentTime;await new Promise(resolve=>setTimeout(resolve,200));return{advance:audio.currentTime-time,paused:audio.paused,animations:document.querySelector('.metronome-arm').getAnimations().length}});assert.equal(afterClear.paused,false);assert.ok(afterClear.advance>.1);assert.equal(afterClear.animations,0);assert.deepEqual(errors,[]);
  console.log(`PASS: ${motion.samples.length} frames across six seconds of real audio; no stalls or sync jumps; final drift ${error.toFixed(1)}ms.`);
 }finally{await browser.close();await vite.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import(process.cwd()+'/node_modules/vite/dist/node/index.js');
 const vite=await createServer({root:process.cwd(),cacheDir:'/tmp/verify-tempo-preview-vite',server:{host:'127.0.0.1',port:5203,strictPort:true,hmr:false}});await vite.listen();
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:800,height:700}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const html=`<html><body style="margin:0;background:#18181b"><div id="root"></div><script type="module">
  import React,{useState}from'react';import{createRoot}from'react-dom/client';import Bpm from '/src/echo/BpmPicker.jsx';import Metronome from '/src/echo/Metronome3D.jsx';import Key from '/src/echo/KeyPicker.jsx';
  import '/src/components/adminWorkspace.css';
  const audio=document.createElement('audio');let time=0,paused=true,rate=1;
  Object.defineProperties(audio,{currentTime:{get:()=>time,set:t=>{time=t;audio.dispatchEvent(new Event('seeked'))}},paused:{get:()=>paused},readyState:{get:()=>4},playbackRate:{get:()=>rate,set:r=>{rate=r;audio.dispatchEvent(new Event('ratechange'))}}});
  audio.play=async()=>{paused=false;audio.dispatchEvent(new Event('play'));audio.dispatchEvent(new Event('playing'))};audio.pause=()=>{paused=true;audio.dispatchEvent(new Event('pause'))};
  const tape=document.createElement('div');tape.className='transcription-audio-tape';tape.append(audio);document.body.append(tape);window.qaAudio=audio;
  function App(){const[bpm,setBpm]=useState(120),[keys,setKeys]=useState([]);return React.createElement('div',{className:'admin-workspace',style:{display:'block',width:400,padding:20,margin:'auto'}},React.createElement(Metronome,{bpm,audioUrl:'fixture.wav',range:{startSec:2,endSec:4}}),React.createElement(Bpm,{value:bpm,onChange:setBpm,audioUrl:'fixture.wav',range:{startSec:2,endSec:4}}),React.createElement(Key,{audioUrl:'fixture.wav',value:keys,onChange:setKeys}))}window.qaRoot=createRoot(document.getElementById('root'));window.qaRoot.render(React.createElement(App));
  </script></body></html>`;
  await page.route('**/__tempo_qa__*',async r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/__tempo_qa__',html.replace('<script type="module">','<script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;'))}):r.continue());
  await page.goto('http://127.0.0.1:5203/__tempo_qa__');
  await page.getByRole('button',{name:'Play music preview'}).click();assert.equal(await page.evaluate(()=>qaAudio.currentTime),2);
  await page.waitForFunction(()=>document.querySelector('.metronome-arm').getAnimations().some(a=>a.playState==='running'));
  const before=await page.locator('.metronome-arm').evaluate(n=>n.getAnimations()[0].currentTime);await page.waitForTimeout(150);const after=await page.locator('.metronome-arm').evaluate(n=>n.getAnimations()[0].currentTime);assert.ok(after>before+70,'Swing advances on browser animation timeline');
  await page.evaluate(()=>{qaAudio.currentTime=2.5;qaAudio.playbackRate=1.5});assert.equal(await page.locator('.metronome-arm').evaluate(n=>n.getAnimations()[0].playbackRate),1.5);
  await page.getByRole('button',{name:'Stop music preview'}).click();assert.equal(await page.evaluate(()=>qaAudio.paused),true);assert.equal(await page.evaluate(()=>qaAudio.currentTime),2);await page.waitForTimeout(250);
  assert.equal(await page.locator('.metronome-arm').evaluate(n=>getComputedStyle(n).transform),'matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('button',{name:'Play music preview'}).click();await page.evaluate(()=>qaAudio.currentTime=4.1);await page.getByRole('button',{name:'Play music preview'}).waitFor();assert.equal(await page.evaluate(()=>qaAudio.paused),true);
  const tabs=page.getByRole('tablist',{name:'Musical key mode'}),header=page.locator('.key-picker-menu>header');const a=await tabs.boundingBox(),b=await header.boundingBox();assert.ok(Math.abs(a.x+a.width/2-b.x-b.width/2)<1);
  await page.getByRole('tab',{name:'Minor',exact:true}).click();assert.equal(await page.getByRole('tab',{name:'Minor',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await page.locator('.key-picker-trigger').count(),0);assert.equal(await page.locator('.key-picker-detect>button').count(),1);
  await page.getByRole('button',{name:'C minor',exact:true}).click();const white=await page.getByRole('button',{name:'C minor',exact:true}).evaluate(n=>getComputedStyle(n).backgroundImage),black=await page.locator('.key-picker-key.is-black').first().evaluate(n=>getComputedStyle(n).backgroundImage);await page.screenshot({path:'/tmp/tempo-controls.png'});assert.ok(white.includes('255, 255, 255'),JSON.stringify(await page.getByRole('button',{name:'C minor',exact:true}).evaluate(n=>({html:n.outerHTML,style:getComputedStyle(n).cssText,background:getComputedStyle(n).background,rules:[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].filter(r=>r.selectorText&&n.matches(r.selectorText)&&r.style.background).map(r=>r.cssText)}catch{return[]}})}))));assert.ok(black.includes('5, 5, 5'));
  await page.screenshot({path:'/tmp/tempo-controls.png'});
  await page.getByRole('button',{name:'Play music preview'}).click();await page.evaluate(()=>qaRoot.unmount());assert.equal(await page.evaluate(()=>qaAudio.paused),true);assert.deepEqual(errors,[]);
  console.log('PASS: Play/Stop, atom boundaries, unmount cleanup, animated swing, seek/rate sync, centered mode tabs, one detection button, natural key colors.');
 }finally{await browser.close();await vite.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

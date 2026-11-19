const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import(process.cwd()+'/node_modules/vite/dist/node/index.js');
 const vite=await createServer({root:process.cwd(),cacheDir:'/tmp/verify-recording-waveforms-vite',server:{host:'127.0.0.1',port:5202,strictPort:true,hmr:false}});await vite.listen();
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE',e.stack)});

  let writes=0,fail=false;let rows=[{id:'r1',name:'Published session',status:'PUBLISHED',workType:'MIX',audioUrl:'https://fixture.test/audio.wav',coverImage:'',description:'',releaseDate:'',revision:1,stems:{channels:['vocals','drums','bass','guitar','piano','other'].map(name=>({name,url:'https://fixture.test/audio.wav'})),duration:1,splitAt:'2026-11-18T12:00:00Z'},atoms:[{id:'a1',name:'Segment',releaseYear:null,sound:{musicianCredits:[],bpm:null,key:null,rhythmIds:[],genreIds:[]},lyrics:null}]}];
  await page.route('**/api/**',async route=>{
   const u=new URL(route.request().url()),method=route.request().method();let json={items:[]};
   if(u.pathname.endsWith('/auth/me'))json={user:{id:'qa-admin'}};
   else if(u.pathname.endsWith('/work-types'))json={items:[{id:'MIX',name:'Mix'}]};
   else if(u.pathname.includes('/recordings')&&['POST','PUT'].includes(method)){
    await new Promise(r=>setTimeout(r,700));if(fail)return route.fulfill({status:503,json:{message:'Test autosave failure'}});
    writes++;const body=route.request().postDataJSON(),item={...rows.find(r=>r.id===u.pathname.split('/').at(-1)),...body,id:method==='POST'?'new-draft':'r1',revision:writes+1};rows=[item,...rows.filter(r=>r.id!==item.id)];json={item};console.log('SAVED',writes,item.status);
   }else if(u.pathname.endsWith('/recordings'))json={items:rows.filter(r=>!u.searchParams.get('status')||r.status===u.searchParams.get('status'))};
   else if(u.pathname.endsWith('/admin/music-archive'))json={collections:[]};
   return route.fulfill({json});
  });
  const wav=Buffer.alloc(44+32000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  for(let i=0;i<16000;i++)wav.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/16000)*.25*32767),44+i*2);
  await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'audio/wav',body:wav,headers:{'Access-Control-Allow-Origin':'*'}}));
  const html=`<html><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import React from 'react';import{createRoot}from 'react-dom/client';import Admin from '/src/echo/OntologyArchiveAdmin.jsx';import '/src/styles/reset.css';import '/src/components/adminWorkspace.css';import '/src/echo/echo.css';createRoot(document.getElementById('root')).render(React.createElement('div',{className:'admin-workspace',style:{display:'block',height:'100vh'}},React.createElement(Admin,{token:'qa-token'})));</script></body></html>`;
  await page.route('**/__autosave_qa__*',async r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/__autosave_qa__',html)}):r.continue());await page.goto('http://127.0.0.1:5202/__autosave_qa__',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Published session/}).click();await page.getByRole('button',{name:'Open recording',exact:true}).click();
  const ready=()=>page.waitForFunction(()=>{const waves=[...document.querySelectorAll('.stem-lane-wave .audio-tape-wave')],master=document.querySelector('.audio-tape-track .audio-tape-wave');return waves.length===6&&waves.every(w=>w.getAttribute('d'))&&master?.getAttribute('d');});await ready();
  const check=async()=>{const visual=await page.evaluate(()=>{const style=n=>{const s=getComputedStyle(n);return{stroke:s.stroke,width:s.strokeWidth,opacity:s.opacity,filter:s.filter,vector:s.vectorEffect,join:s.strokeLinejoin}},master=document.querySelector('.audio-tape-track .audio-tape-wave'),surface=n=>{const s=getComputedStyle(n);return{image:s.backgroundImage,color:s.backgroundColor}},track=document.querySelector('.audio-tape-track');return{master:style(master),masterPath:master.getAttribute('d'),background:surface(track),channels:[...document.querySelectorAll('.stem-lane-wave')].map(lane=>({style:style(lane.querySelector('.audio-tape-wave')),path:lane.querySelector('.audio-tape-wave').getAttribute('d'),baseline:Boolean(lane.querySelector('.audio-tape-baseline')),background:surface(lane)}))}});for(const lane of visual.channels){assert.deepEqual(lane.style,visual.master,'Channel stroke treatment must match master');assert.deepEqual(lane.background,visual.background,'Channel surface must match master');assert.equal(lane.path,visual.masterPath,'Identical audio uses identical amplitude scaling and detail');assert.equal(lane.baseline,true);}};
  await check();const span=await page.locator('.audio-tape-track>svg').getAttribute('data-wave-span');await page.locator('.stem-lane-wave').first().hover();await page.mouse.wheel(0,-240);await page.waitForFunction(old=>document.querySelector('.audio-tape-track>svg').getAttribute('data-wave-span')!==old,span);await ready();await check();await page.locator('.stem-lane-wave').first().click({position:{x:100,y:20}});await page.waitForFunction(()=>document.querySelector('.transcription-audio-tape audio').currentTime>0);assert.ok(await page.locator('.transcription-audio-tape audio').evaluate(audio=>audio.currentTime)>0,'Channel seeking continues to work');assert.equal(writes,0);assert.deepEqual(errors,[]);console.log('PASS: all six channels match master color, stroke, opacity, grid, baseline, resolution and amplitude; zoom and seeking still work.');

 }finally{await browser.close();await vite.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

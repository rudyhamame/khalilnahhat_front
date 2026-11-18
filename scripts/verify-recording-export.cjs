const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');const {compressTrimmedAudio}=require('/home/rudy/Documents/khalil/khalil-back/src/compress-trimmed-audio');
(async()=>{
 const {createServer}=await import(process.cwd()+'/node_modules/vite/dist/node/index.js');
 const vite=await createServer({root:process.cwd(),cacheDir:'/tmp/verify-autosave-vite',server:{host:'127.0.0.1',port:5198,strictPort:true,hmr:false}});await vite.listen();
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE',e.stack)});

  let writes=0,fail=false,convertedAac=null,conversions=0;let rows=[{id:'r1',name:'Published session',status:'PUBLISHED',workType:'MIX',audioUrl:'https://fixture.test/audio.wav',coverImage:'',description:'',releaseDate:'',revision:1,atoms:[{id:'a1',name:'Segment',releaseYear:null,sound:{musicianCredits:[],bpm:null,key:null,rhythmIds:[],genreIds:[]},lyrics:null}]}];
  await page.route('**/api/**',async route=>{
   const u=new URL(route.request().url()),method=route.request().method();let json={items:[]};
   if(u.pathname.endsWith('/music-archive/upload')){
    const form=await new Response(route.request().postDataBuffer(),{headers:{'content-type':route.request().headers()['content-type']}}).formData();assert.equal(form.get('exportFormat'),'aac');const buffer=Buffer.from(await form.get('file').arrayBuffer());assert.equal(buffer.toString('ascii',0,4),'RIFF');convertedAac=await compressTrimmedAudio({buffer,size:buffer.length,mimetype:'audio/wav',originalname:'export.wav'},'aac');conversions++;return route.fulfill({json:{url:'https://fixture.test/export.m4a',exportFormat:'aac'}});
   }
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
  await page.route('https://fixture.test/**',r=>r.fulfill({contentType:r.request().url().endsWith('.m4a')?'audio/mp4':'audio/wav',body:r.request().url().endsWith('.m4a')?convertedAac.buffer:wav,headers:{'Access-Control-Allow-Origin':'*'}}));
  const html=`<html><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import React from 'react';import{createRoot}from 'react-dom/client';import Admin from '/src/echo/OntologyArchiveAdmin.jsx';import '/src/styles/reset.css';import '/src/components/adminWorkspace.css';import '/src/echo/echo.css';createRoot(document.getElementById('root')).render(React.createElement('div',{className:'admin-workspace',style:{display:'block',height:'100vh'}},React.createElement(Admin,{token:'qa-token'})));</script></body></html>`;
  await page.route('**/__autosave_qa__*',async r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/__autosave_qa__',html)}):r.continue());await page.goto('http://127.0.0.1:5198/__autosave_qa__',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Published session/}).click();await page.getByRole('button',{name:'Open recording',exact:true}).click();const editor=page.getByRole('region',{name:'Recording editor',exact:true});await editor.waitFor();await page.waitForTimeout(1400);
  const group=editor.getByRole('group',{name:'Export as',exact:true});let downloads=0;page.on('download',()=>downloads++);
  await group.getByRole('button',{name:/^AAC/}).click();const question=page.getByRole('dialog',{name:'Download recording?',exact:true});await question.waitFor();assert.ok((await question.textContent()).includes('AAC (M4A)'));await question.getByRole('button',{name:'Cancel',exact:true}).click();await question.waitFor({state:'hidden'});assert.equal(conversions,0);assert.equal(downloads,0);
  for(const [format,ext] of [['WAV','wav'],['MP3','mp3'],['AAC','m4a']]){
   await group.getByRole('button',{name:new RegExp('^'+format)}).click();await question.waitFor();const pending=page.waitForEvent('download');await question.getByRole('button',{name:'Download '+format,exact:true}).click();const download=await pending;assert.equal(download.suggestedFilename(),'published-session.'+ext);const data=await fs.readFile(await download.path());if(format==='WAV')assert.equal(data.toString('ascii',0,4),'RIFF');if(format==='AAC')assert.equal(data.toString('ascii',4,8),'ftyp');if(format==='MP3')assert.ok(data.subarray(0,3).toString()==='ID3'||data[0]===255);console.log('Verified download',format,data.length);
  }
  await page.waitForTimeout(1600);assert.equal(conversions,1);assert.equal(downloads,3);assert.equal(writes,0,'Export must not save or unpublish the recording');assert.equal(rows[0].status,'PUBLISHED');assert.deepEqual(errors,[]);console.log('PASS: all export options enabled, confirmation/Cancel, actual MP3/WAV/AAC bytes, correct filenames, and recording unchanged.');

 }finally{await browser.close();await vite.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

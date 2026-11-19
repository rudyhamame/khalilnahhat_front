const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import(process.cwd()+'/node_modules/vite/dist/node/index.js');
 const vite=await createServer({root:process.cwd(),cacheDir:'/tmp/verify-atoms-layout-vite',server:{host:'127.0.0.1',port:5201,strictPort:true,hmr:false}});await vite.listen();
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE',e.stack)});

  let writes=0,fail=false;let rows=[{id:'r1',name:'Published session',status:'PUBLISHED',workType:'MIX',audioUrl:'https://fixture.test/audio.wav',coverImage:'',description:'',releaseDate:'',revision:1,atoms:[{id:'a1',name:'Segment',releaseYear:null,sound:{musicianCredits:[],bpm:null,key:null,rhythmIds:[],genreIds:[]},lyrics:null}]}];
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
  await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'audio/wav',body:wav,headers:{'Access-Control-Allow-Origin':'*'}}));
  const html=`<html><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import React from 'react';import{createRoot}from 'react-dom/client';import Admin from '/src/echo/OntologyArchiveAdmin.jsx';import '/src/styles/reset.css';import '/src/components/adminWorkspace.css';import '/src/echo/echo.css';createRoot(document.getElementById('root')).render(React.createElement('div',{className:'admin-workspace',style:{display:'block',height:'100vh'}},React.createElement(Admin,{token:'qa-token'})));</script></body></html>`;
  await page.route('**/__autosave_qa__*',async r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/__autosave_qa__',html)}):r.continue());await page.goto('http://127.0.0.1:5201/__autosave_qa__',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Published session/}).click();await page.getByRole('button',{name:'Open recording',exact:true}).click();const editor=page.getByRole('region',{name:'Recording editor',exact:true});await editor.waitFor();
  for(const width of [1500,1230])for(const zoom of [1,.9]){
   await page.setViewportSize({width,height:1000});await page.evaluate(z=>document.documentElement.style.zoom=z,zoom);await page.waitForTimeout(250);
   const layout=await editor.evaluate(el=>{const r=s=>el.querySelector(s).getBoundingClientRect().toJSON(),card=el.querySelector('.recording-atoms-card');return{header:r('.ontology-page-bar'),atoms:r('.recording-atoms-column'),footer:r('.recording-level-footer'),hints:r('.recording-editor-subheader'),wrapperRadius:getComputedStyle(el.querySelector('.recording-atoms-column')).borderRadius,radius:getComputedStyle(card).borderRadius,atomRadius:getComputedStyle(card.querySelector('.recording-atom-card')).borderRadius,footerZ:getComputedStyle(el.querySelector('.recording-level-footer')).zIndex,scroll:getComputedStyle(card).overflowY}});
   console.log(width,zoom,JSON.stringify(layout));assert.ok(Math.abs(layout.atoms.top-layout.header.bottom)<1,'Atoms start exactly at the header bottom');assert.ok(Math.abs(layout.atoms.bottom-layout.footer.top)<1,'Atoms fill down to the shared footer');assert.ok(layout.hints.right<=layout.atoms.left+1,'Hints stay over the waveform');assert.equal(layout.wrapperRadius,'0px','Outer fieldset must not clip the card with rounded corners');assert.equal(layout.radius,'0px');assert.equal(layout.atomRadius,'0px');assert.equal(layout.footerZ,'-1');assert.equal(layout.scroll,'auto');assert.ok(Math.abs(layout.footer.right-layout.header.right)<1,'Footer keeps its full width');
  }
  assert.deepEqual(errors,[]);console.log('PASS: atoms touch header, fill to footer, scroll independently and have square corners at both desktop widths and zoom levels.');

 }finally{await browser.close();await vite.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

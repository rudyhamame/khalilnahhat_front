const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import(process.cwd()+'/node_modules/vite/dist/node/index.js');
 const vite=await createServer({root:process.cwd(),cacheDir:'/tmp/verify-autosave-vite',server:{host:'127.0.0.1',port:5198,strictPort:true,hmr:false}});await vite.listen();
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
  await page.route('**/__autosave_qa__*',async r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/__autosave_qa__',html)}):r.continue());await page.goto('http://127.0.0.1:5198/__autosave_qa__',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Published session/}).click();await page.getByRole('button',{name:'Open recording',exact:true}).click();
  const editor=page.getByRole('region',{name:'Recording editor',exact:true}),submit=editor.locator('.ontology-page-bar>.ontology-recording-submit'),name=editor.getByRole('textbox',{name:/^Name/});await editor.waitFor();await page.waitForTimeout(1800);assert.equal(writes,0,'Opening should not autosave');assert.equal(await submit.count(),1);assert.equal(await editor.getByRole('radiogroup',{name:'Export as',exact:true}).count(),1);assert.equal(await editor.getByRole('button',{name:'More actions',exact:true}).count(),0);assert.equal(await editor.getByRole('button',{name:'Download',exact:true}).count(),0);assert.equal(await submit.textContent(),'Save recording');
  const style=await submit.evaluate(n=>({color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor}));assert.equal(style.color,'rgb(255, 255, 255)');
  await name.fill('Auto');await page.waitForTimeout(200);await name.fill('Autosaved session');await page.waitForTimeout(400);assert.equal(writes,0);await editor.getByText('Autosaving…',{exact:true}).waitFor();await editor.getByText('All changes saved',{exact:true}).waitFor();assert.equal(writes,1);assert.equal(rows[0].status,'DRAFT');assert.equal(rows[0].name,'Autosaved session');assert.equal(await submit.count(),1);assert.equal(await submit.textContent(),'Publish recording');assert.equal(await submit.evaluate(n=>getComputedStyle(n).backgroundColor),style.background);await page.waitForTimeout(1800);assert.equal(writes,1,'No autosave feedback loop');
  await submit.click();await editor.getByRole('button',{name:'Save recording',exact:true}).waitFor();assert.equal(rows[0].status,'PUBLISHED');assert.equal(writes,2);
  fail=true;await name.fill('Keep failed edits');await editor.getByText('Autosave failed',{exact:true}).waitFor();assert.equal(await name.inputValue(),'Keep failed edits');fail=false;await submit.click();await editor.getByRole('button',{name:'Publish recording',exact:true}).waitFor();assert.equal(rows[0].name,'Keep failed edits');assert.equal(writes,3);
  await editor.getByRole('button',{name:'Back',exact:true}).click();await editor.waitFor({state:'hidden'});await page.waitForURL(u=>!u.searchParams.has('recording'));await page.getByRole('button',{name:'New recording',exact:true}).click();await editor.waitFor();await name.fill('Incomplete autosaved draft');await editor.getByText('Saved in this browser',{exact:true}).waitFor();const count=writes;await page.reload({waitUntil:'domcontentloaded'});await editor.waitFor();assert.equal(await name.inputValue(),'Incomplete autosaved draft');assert.equal(writes,count);assert.deepEqual(errors,[]);console.log('PASS: debounced autosave, progress/saved status, error recovery, restored incomplete drafts, single conditional action, and white Save text.');
 }finally{await browser.close();await vite.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

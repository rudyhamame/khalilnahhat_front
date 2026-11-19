const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {createServer}=await import(process.cwd()+'/node_modules/vite/dist/node/index.js');
 const vite=await createServer({root:process.cwd(),cacheDir:'/tmp/verify-atom-rhythm-compat-vite',server:{host:'127.0.0.1',port:5210,strictPort:true,hmr:false}});await vite.listen();
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE',e.stack)});

  const requests=[];let active=0,maxActive=0,vocabularyReads=0;let writes=0,fail=false;let rows=[{id:'r1',name:'Published session',status:'PUBLISHED',workType:'MIX',audioUrl:'https://fixture.test/audio.wav',coverImage:'',description:'',releaseDate:'',revision:1,atoms:[{id:'a1',name:'Segment',releaseYear:null,sound:{musicianCredits:[],bpm:120,key:null,rhythmIds:[],genreIds:[]},lyrics:null}]}];
  await page.route('**/api/**',async route=>{
   const u=new URL(route.request().url()),method=route.request().method();let json={items:[]};if(u.pathname.endsWith('/vocabulary'))vocabularyReads++;
   if(u.pathname.endsWith('/auth/me'))json={user:{id:'qa-admin'}};
   else if(u.pathname.endsWith('/work-types'))json={items:[{id:'MIX',name:'Mix'}]};
   else if(u.pathname.includes('/recordings')&&['POST','PUT'].includes(method)){
    const entry={body:route.request().postDataJSON(),release:null};active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>{entry.release=resolve;requests.push(entry);});active--;
    writes++;const body=route.request().postDataJSON(),item={...rows.find(r=>r.id===u.pathname.split('/').at(-1)),...body,id:method==='POST'?'new-draft':'r1',revision:writes+1};rows=[item,...rows.filter(r=>r.id!==item.id)];json={item};console.log('SAVED',writes,item.status);
   }else if(u.pathname.endsWith('/recordings'))json={items:rows.filter(r=>!u.searchParams.get('status')||r.status===u.searchParams.get('status'))};
   else if(u.pathname.endsWith('/admin/music-archive'))json={collections:[]};
   return route.fulfill({json});
  });
  const wav=Buffer.alloc(44+16000*2*20);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  rows[0].audioUrl='data:audio/wav;base64,'+wav.toString('base64');
  await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'audio/wav',body:wav,headers:{'Access-Control-Allow-Origin':'*'}}));
  const html=`<html><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module">import React from 'react';import{createRoot}from 'react-dom/client';import Admin from '/src/echo/OntologyArchiveAdmin.jsx';import '/src/styles/reset.css';import '/src/components/adminWorkspace.css';import '/src/echo/echo.css';createRoot(document.getElementById('root')).render(React.createElement('div',{className:'admin-workspace',style:{display:'block',height:'100vh'}},React.createElement(Admin,{token:'qa-token'})));</script></body></html>`;
  await page.route('**/__autosave_qa__*',async r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/__autosave_qa__',html)}):r.continue());await page.goto('http://127.0.0.1:5210/__autosave_qa__',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/Published session/}).click();await page.goto('http://127.0.0.1:5210/__autosave_qa__?recording=r1',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Edit atom 1',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Edit recording atom 1',exact:true});
  await dialog.getByRole('combobox',{name:'Atom time signature',exact:true}).selectOption('4/8');
  await page.getByText('The API needs updating to save beat and measure settings. Your browser draft has been kept.',{exact:true}).waitFor();
  assert.equal(requests.length,0,'Unsupported timing metadata must be detected before any recording write');assert.equal(await dialog.getByRole('combobox',{name:'Atom time signature'}).inputValue(),'4/8');await dialog.getByRole('textbox',{name:/^Atom name/}).fill('Draft remains editable');assert.equal(await dialog.getByRole('textbox',{name:/^Atom name/}).inputValue(),'Draft remains editable');assert.deepEqual(errors,[]);console.log('PASS: older APIs cannot silently strip rhythm timing; the browser draft stays editable and no recording write is sent.');
 }finally{await browser.close();await vite.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

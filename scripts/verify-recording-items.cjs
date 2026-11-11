const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {fixture}=require('../../khalil-back/test/helpers/music-ontology-fixture.cjs');
const assert=require('node:assert/strict');const fs=require('node:fs/promises');
(async()=>{
 let db,vite,browser,page;const output='artifacts/recording-items';await fs.mkdir(output,{recursive:true});
 try{
  db=await fixture();const {createServer}=await import('vite');vite=await createServer({root:process.cwd(),cacheDir:'/tmp/recording-items-ui-cache',server:{host:'127.0.0.1',port:5194,strictPort:true,hmr:false}});await vite.listen();
  browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:1560,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let failSave=false;
  await page.route('**/api/**',async route=>{
   const u=new URL(route.request().url());
   if(failSave&&route.request().method()==='PUT'&&u.pathname.includes('/recordings/'))return route.fulfill({status:503,json:{message:'Fixture save failure'}});
   try{const response=await route.fetch({url:db.origin+u.pathname+u.search});await route.fulfill({response});}catch{await route.abort();}
  });
  const html=`<html><body style="margin:0;background:#101c15;color:#eee"><div id="root"></div><script type="module">import React from 'react';import {createRoot} from 'react-dom/client';import Admin from '/src/echo/OntologyArchiveAdmin.jsx';import '/src/styles/reset.css';import '/src/components/adminWorkspace.css';import '/src/echo/echo.css';createRoot(document.getElementById('root')).render(React.createElement('div',{className:'admin-workspace',style:{display:'block',padding:'16px'}},React.createElement(Admin,{token:'qa-admin'})));</script></body></html>`;
  await page.route('**/__items__',async route=>route.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/__items__.html',html)}));
  await page.goto('http://127.0.0.1:5194/__items__');await page.getByRole('button',{name:'MIX · Evening collection',exact:true}).click();await page.getByRole('button',{name:'Edit recording',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Recording editor',exact:true});await dialog.waitFor();
  assert.equal(await dialog.locator('[aria-label="Recording transcription"]').count(),1);assert.equal(await dialog.getByText("Recording's Original Music Items",{exact:true}).count(),0);
  const first=dialog.getByRole('article',{name:'Recording item 1',exact:true});await first.getByLabel('Item name',{exact:true}).fill('First vocal item');await first.getByLabel('Release year',{exact:true}).fill('1998');await first.getByLabel('With vocals?',{exact:true}).selectOption('yes');await first.getByLabel(/^Language/).selectOption(db.language);
  await first.getByLabel('Start · seconds',{exact:true}).fill('0');await first.getByLabel('End · seconds',{exact:true}).fill('10');
  for(const label of ['vocalist credit','musician credit']){const group=first.getByRole('group',{name:new RegExp('^'+label+'$','i')});await group.getByRole('button',{name:'Add '+label,exact:true}).click();await group.getByLabel('Person',{exact:true}).last().selectOption(db.artist);}
  await dialog.getByRole('button',{name:'Add item',exact:true}).click();const second=dialog.getByRole('article',{name:'Recording item 2',exact:true});await second.getByLabel('Item name',{exact:true}).fill('Second instrumental item');await second.getByLabel('Release year',{exact:true}).fill('2002');assert.equal(await second.getByLabel(/^Language/).count(),0);
  await dialog.locator('.ontology-editor-body').evaluate(el=>el.scrollTop=0);await page.screenshot({path:output+'/desktop.png'});
  failSave=true;await dialog.getByRole('button',{name:'Save recording',exact:true}).click();await dialog.getByText('Fixture save failure',{exact:true}).waitFor();assert.equal(await first.getByLabel('Item name',{exact:true}).inputValue(),'First vocal item');
  failSave=false;await dialog.getByRole('button',{name:'Save recording',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Edit recording',exact:true}).click();await dialog.waitFor();assert.equal(await dialog.getByRole('article',{name:'Recording item 2',exact:true}).getByLabel('Release year',{exact:true}).inputValue(),'2002');
  await page.setViewportSize({width:390,height:844});await dialog.locator('.recording-basics-main').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/mobile.png'});const boxes=await dialog.locator('.recording-basics--items').evaluate(el=>[...el.children].map(child=>{const r=child.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));assert.ok(boxes.every((box,index)=>!index||box.top>=boxes[index-1].bottom-1),'Mobile columns must stack without overlap');
  const overflow=await dialog.evaluate(el=>el.scrollWidth>el.clientWidth+1);assert.equal(overflow,false,'Dialog must fit mobile width');
  assert.deepEqual(errors,[]);await fs.writeFile(output+'/result.json',JSON.stringify({passed:true,checks:['Old content column removed','Independent lyrical and instrumental items','Multiple credit categories','Failed save retains draft','API save and reload','Mobile layout'],pageErrors:errors},null,2));console.log('Recording item browser checks passed');
 }catch(error){if(page)await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await browser?.close();await vite?.close();await db?.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});

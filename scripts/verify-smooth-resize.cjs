const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');

// Regression: admin CSS zoom must not feed visual pixel heights back into layout pixels.
(async()=>{
 const source=await fs.readFile(path.resolve(__dirname,'../src/lib/smoothResize.js'),'utf8');
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({reducedMotion:'no-preference'});
  await page.route('http://resize.test/**',route=>route.fulfill(route.request().url().endsWith('.js')?{contentType:'application/javascript',body:source}:{contentType:'text/html',body:`<html><body><main style="width:300px"><details style="min-height:3px;overflow:visible;transition:color 1s linear;padding:8px;border:1px solid #888"><summary>Current list</summary><div style="height:280px">Six channel IDs</div></details></main><script type="module">import{installSmoothResize}from'/smoothResize.js';installSmoothResize();window.ready=true;</script></body></html>`}));
  await page.goto('http://resize.test/');await page.waitForFunction(()=>window.ready);
  for(const zoom of [0.8,0.9,1])for(const boxSizing of ['content-box','border-box']){
   await page.evaluate(({zoom,boxSizing})=>{document.documentElement.style.zoom=zoom;document.querySelectorAll('details').forEach(el=>el.style.boxSizing=boxSizing);},{zoom,boxSizing});
   await page.waitForTimeout(650);
   // A future list is discovered by the shared MutationObserver without component setup.
   await page.evaluate(()=>{document.querySelector('#future')?.remove();const future=document.querySelector('details').cloneNode(true);future.id='future';future.querySelector('summary').textContent='Future list';document.querySelector('main').append(future);});
   for(const selector of ['details:first-child','#future']){
    const list=page.locator(selector),summary=list.locator('summary');
    const settled=()=>list.evaluate(el=>({height:el.getBoundingClientRect().height,inlineHeight:el.style.height,overflow:el.style.overflow,transition:el.style.transition,minHeight:el.style.minHeight,timer:el._smoothTimer}));
    const closed=await settled();
    for(let cycle=0;cycle<2;cycle++){
     await summary.click();await page.waitForTimeout(650);const open=await settled();
     assert.equal(open.inlineHeight,'',`${zoom} ${boxSizing}: opening releases inline height`);
     assert.ok(open.height>closed.height+100,'Opening reveals list contents');
     assert.equal(open.timer,null,'Animation ends without a measurement feedback loop');
     assert.equal(open.overflow,'visible');assert.equal(open.transition,'color 1s linear');assert.equal(open.minHeight,'3px');
     await summary.click();await page.waitForTimeout(650);const collapsed=await settled();
     assert.equal(collapsed.inlineHeight,'','Closing releases inline height');
     assert.ok(Math.abs(collapsed.height-closed.height)<1,`${zoom} ${boxSizing} ${selector}: closing restores ${closed.height}, got ${collapsed.height}`);
    }
   }
  }
  console.log('Passed: existing and dynamically inserted lists, 80%/90%/100% CSS zoom, both box models, repeated open/close, and original styles restored.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

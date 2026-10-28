const {chromium}=require('/home/rudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>sessionStorage.setItem('echo-preflight-complete','true'));
 await page.goto('http://127.0.0.1:5176/',{waitUntil:'domcontentloaded'});
 await page.locator('#about-dj-khalil').waitFor({state:'attached',timeout:30000});
 const selectors=['#home-music-archive .home-archive-player','#services .setup-flip','#live .home-live-console','#about-dj-khalil'];
 const results=[];
 for(const size of [{width:1440,height:900},{width:390,height:640}]){
  await page.setViewportSize(size);
  for(const selector of [...selectors,...selectors.toReversed()]){
   await page.locator(selector).evaluate(el=>el.closest('section').scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForTimeout(1500);
   const state=await page.locator(selector).evaluate(el=>{const r=el.closest('section').getBoundingClientRect();return {visible:r.bottom>0&&r.top<innerHeight,phase:el.classList.contains('is-in'),opacity:getComputedStyle(el).opacity};});
   if(!state.visible||!state.phase||Number(state.opacity)<.99)throw Error(JSON.stringify({size,selector,state}));
  }
  // With only a small fraction visible, a tall chapter must remain revealed.
  await page.locator('#live').evaluate(el=>{el.style.minHeight='10000px';el.style.height='10000px';window.scrollTo({top:el.getBoundingClientRect().top+scrollY+4000,behavior:'instant'});});
  await page.waitForTimeout(1200);
  if(!await page.locator('#live .home-live-console').evaluate(el=>el.classList.contains('is-in')))throw Error('Tall live chapter disappeared');
  await page.locator('#live').evaluate(el=>{el.style.minHeight='';el.style.height='';});
  results.push({viewport:size,sectionsCheckedInBothDirections:4,tallChapterRemainsRevealed:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForTimeout(100);
 for(const selector of selectors)if(!await page.locator(selector).evaluate(el=>el.classList.contains('is-in')))throw Error('Reduced motion did not reveal '+selector);
 console.log(JSON.stringify({passed:true,results,reducedMotionRevealsAll:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

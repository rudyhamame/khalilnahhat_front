import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(){
 let y=2000,time=1000;
 const listeners=new Map(),body={};
 const sections=['hero','live','echo-ai','availability'].map((id,index)=>({id,parentElement:body,style:{overflowY:'hidden'},getBoundingClientRect:()=>({top:index*1000-y,bottom:(index+1)*1000-y,height:1000})}));
 const workspace=sections[2];
 const target={parentElement:workspace,style:{overflowY:'hidden'},closest:selector=>selector==='#echo-ai'?workspace:null,matches:selector=>selector.includes('.event-order-aside')};
 const scroller={parentElement:target,style:{overflowY:'auto'},scrollTop:0,clientHeight:200,scrollHeight:600,closest:target.closest,matches:()=>false};
 const view={innerWidth:1400,getComputedStyle:node=>node.style,addEventListener:(type,callback)=>listeners.set(type,callback),removeEventListener(){},scrollTo:options=>{y=options.top;}};
 const classes=new Set();
 const document={body,documentElement:{scrollHeight:4000,classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)}},getElementById:id=>sections.find(node=>node.id===id),querySelector:selector=>selector==='.echo-artist-sequence'?sections[0]:selector.startsWith('#')?sections.find(x=>x.id===selector.slice(1))||null:null};
 const context={window:view,document,innerHeight:1000,get scrollY(){return y;},getComputedStyle:view.getComputedStyle,performance:{now:()=>time},matchMedia:()=>({matches:true}),scrollTo:view.scrollTo,requestAnimationFrame:()=>1,cancelAnimationFrame(){},useEffect:fn=>fn(),APP_VIEWPORT_TARGETS:{assistant:'#echo-ai',availability:'#availability'}};
 const source=fs.readFileSync(new URL('../echo/useViewportAlignment.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 vm.runInNewContext(source+';useViewportAlignment()',context);
 const wheel=(node,deltaY)=>{const event={target:node,deltaY,deltaX:0,deltaMode:0,cancelable:true,preventDefault(){this.defaultPrevented=true;}};listeners.get('wheel')(event);return event;};
 const touch=(type,node,pointY)=>{const event={target:node,touches:[{clientX:0,clientY:pointY}],cancelable:true,preventDefault(){this.defaultPrevented=true;}};listeners.get(type)(event);return event;};
 const key=(node,value)=>{const event={target:node,key:value,preventDefault(){this.defaultPrevented=true;}};listeners.get('keydown')(event);return event;};
 const navigate=(source,section='assistant')=>{const event={detail:{source,section},preventDefault(){this.defaultPrevented=true;}};listeners.get('echo:viewport-navigate')(event);return event;};
 return {target,scroller,wheel,touch,key,navigate,classes,sections,get y(){return y;},advance:()=>{time+=300;}};
}
test('wheel gestures never move to another viewport',()=>{
 const f=fixture();assert.ok(f.classes.has('echo-nav-only-scroll'));
 for(const delta of [100,-100]){assert.equal(f.wheel(f.target,delta).defaultPrevented,true);assert.equal(f.y,2000);}
});
test('conversation scrolling works internally and stays inside at both boundaries',()=>{
 const f=fixture();assert.equal(f.wheel(f.scroller,100).defaultPrevented,undefined);
 f.scroller.scrollTop=400;assert.equal(f.wheel(f.scroller,100).defaultPrevented,true);f.advance();f.wheel(f.scroller,100);assert.equal(f.y,2000);
 f.scroller.scrollTop=0;assert.equal(f.wheel(f.scroller,-100).defaultPrevented,true);
});
test('swipes never change viewport but can scroll internal content',()=>{
 const f=fixture();f.touch('touchstart',f.scroller,200);assert.equal(f.touch('touchmove',f.scroller,100).defaultPrevented,undefined);
 f.touch('touchend',f.scroller,100);f.scroller.scrollTop=400;f.touch('touchstart',f.scroller,200);assert.equal(f.touch('touchmove',f.scroller,100).defaultPrevented,true);assert.equal(f.y,2000);
});
test('keyboard page scrolling is blocked while internal content remains scrollable',()=>{
 const f=fixture();assert.equal(f.key(f.scroller,'PageDown').defaultPrevented,undefined);
 f.scroller.scrollTop=400;assert.equal(f.key(f.scroller,'PageDown').defaultPrevented,true);
 for(const key of ['PageDown','PageUp','Home','End',' ','ArrowDown','ArrowUp']){assert.equal(f.key(f.target,key).defaultPrevented,true);assert.equal(f.y,2000);}
});
test('only navigation buttons can request a viewport transition',()=>{
 const f=fixture();assert.equal(f.sections[2].inert,false);assert.equal(f.sections[3].inert,true);for(const source of ['voice','assistant','goal','booking']){assert.equal(f.navigate(source,'availability').defaultPrevented,true);assert.equal(f.y,2000);}
 assert.equal(f.navigate('section-nav','availability').defaultPrevented,true);assert.equal(f.y,3000);assert.equal(f.sections[2].inert,true);assert.equal(f.sections[3].inert,false);
 f.navigate('navigation');assert.equal(f.y,2000);
});

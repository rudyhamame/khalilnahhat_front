import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {bookingWorkspaceCanScroll} from './bookingWorkspaceScroll.js';
function fixture(){
 let y=2000,time=1000;
 const listeners=new Map(),body={};
 const sections=['hero','live','echo-ai','availability'].map((id,index)=>({id,parentElement:body,style:{overflowY:'hidden'},getBoundingClientRect:()=>({top:index*1000-y,bottom:(index+1)*1000-y,height:1000})}));
 const workspace=sections[2];
 const target={parentElement:workspace,style:{overflowY:'hidden'},closest:selector=>selector==='#echo-ai'?workspace:null,matches:selector=>selector.includes('.event-order-aside')};
 const scroller={parentElement:target,style:{overflowY:'auto'},scrollTop:0,clientHeight:200,scrollHeight:600,closest:target.closest,matches:()=>false};
 const view={innerWidth:1400,getComputedStyle:node=>node.style,addEventListener:(type,callback)=>listeners.set(type,callback),removeEventListener(){},scrollTo:options=>{y=options.top;}};
 const document={body,documentElement:{scrollHeight:4000},getElementById:id=>sections.find(node=>node.id===id),querySelector:selector=>selector==='.echo-artist-sequence'?sections[0]:null};
 const context={window:view,document,innerHeight:1000,get scrollY(){return y;},getComputedStyle:view.getComputedStyle,performance:{now:()=>time},matchMedia:()=>({matches:true}),scrollTo:view.scrollTo,requestAnimationFrame:()=>1,cancelAnimationFrame(){},useEffect:fn=>fn(),APP_VIEWPORT_TARGETS:{assistant:'#echo-ai'},bookingWorkspaceCanScroll:(target,direction)=>bookingWorkspaceCanScroll(target,direction,{view})};
 const source=fs.readFileSync(new URL('../echo/useViewportAlignment.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 vm.runInNewContext(source+';useViewportAlignment()',context);
 const wheel=(node,deltaY)=>{const event={target:node,deltaY,deltaX:0,deltaMode:0,cancelable:true,preventDefault(){this.defaultPrevented=true;}};listeners.get('wheel')(event);return event;};
 const touch=(type,node,pointY)=>{const event={target:node,touches:[{clientX:0,clientY:pointY}],cancelable:true,preventDefault(){this.defaultPrevented=true;}};listeners.get(type)(event);return event;};
 const key=(node,value)=>{const event={target:node,key:value,preventDefault(){this.defaultPrevented=true;}};listeners.get('keydown')(event);return event;};
 return {target,scroller,wheel,touch,key,get y(){return y;},advance:()=>{time+=300;}};
}
test('wheel over the former aside moves to the next or previous chapter instead of trapping the page',()=>{
 const f=fixture();assert.equal(f.wheel(f.target,100).defaultPrevented,true);assert.equal(f.y,3000);
 f.advance();f.wheel(f.target,-100);assert.equal(f.y,2000);
});
test('conversation keeps its scroll gesture; a fresh gesture at its boundary can leave the viewport',()=>{
 const f=fixture();assert.equal(f.wheel(f.scroller,100).defaultPrevented,undefined);assert.equal(f.y,2000);
 f.scroller.scrollTop=400;assert.equal(f.wheel(f.scroller,100).defaultPrevented,true);assert.equal(f.y,2000);
 f.advance();assert.equal(f.wheel(f.scroller,100).defaultPrevented,true);assert.equal(f.y,3000);
});
test('touch at a content boundary can leave; a swipe starting within scrollable content stays inside',()=>{
 const f=fixture();f.touch('touchstart',f.scroller,200);assert.equal(f.touch('touchmove',f.scroller,100).defaultPrevented,undefined);assert.equal(f.y,2000);
 f.touch('touchend',f.scroller,100);f.scroller.scrollTop=400;
 f.touch('touchstart',f.scroller,200);assert.equal(f.touch('touchmove',f.scroller,100).defaultPrevented,true);assert.equal(f.y,3000);
});
test('non-booking sections retain their existing scroll policy',()=>{
 assert.equal(bookingWorkspaceCanScroll({closest:()=>null},1,{view:{}}),null);
});

test('PageDown and PageUp can leave the booking panel when its focused content has reached the edge',()=>{
 const f=fixture();assert.equal(f.key(f.scroller,'PageDown').defaultPrevented,undefined);assert.equal(f.y,2000);
 f.scroller.scrollTop=400;assert.equal(f.key(f.scroller,'PageDown').defaultPrevented,true);assert.equal(f.y,3000);
 f.scroller.scrollTop=0;assert.equal(f.key(f.scroller,'PageUp').defaultPrevented,true);assert.equal(f.y,2000);
});

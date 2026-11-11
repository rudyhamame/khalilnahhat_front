import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:EquipmentRoomPlacement}=await server.ssrLoadModule('/src/components/EquipmentRoomPlacement.jsx');

test('the placement editor starts from the saved placement, shows the other equipment, and offers the automatic reset',()=>{
 const items=[{id:'jbl-speaker',name:'Speaker',isActive:true,roomPlacement:{x:1.5,fromBack:2,rotation:30,height:0}},{id:'soundcraft-mixer',name:'Mixer',isActive:true},{id:'led-screen',name:'LED Screen',isActive:true}];
 const html=renderToStaticMarkup(createElement(EquipmentRoomPlacement,{item:items[0],allItems:items,token:'t',onClose(){},onSaved(){},report(){}}));
 assert.match(html,/Place Speaker/);
 assert.match(html,/value="1.5"/);assert.match(html,/value="30"/);
 assert.equal((html.match(/class="eq-ghost"/g)||[]).length,2);
 assert.match(html,/Use automatic position/);assert.match(html,/Save placement/);
 // an item with no placement starts from its automatic spot and cannot be reset
 const fresh=renderToStaticMarkup(createElement(EquipmentRoomPlacement,{item:items[1],allItems:items,token:'t',onClose(){},onSaved(){},report(){}}));
 assert.match(fresh,/class="eq-place-auto" disabled/);
});

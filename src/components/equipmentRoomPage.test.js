import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:EquipmentRoomPage}=await server.ssrLoadModule('/src/components/EquipmentRoomPage.jsx');

test('the 3D placement page starts from the saved placement and offers save and the automatic reset',()=>{
 const items=[{id:'jbl-speaker',name:'Speaker',isActive:true,roomPlacement:{x:1.5,fromBack:2,rotation:30,height:0}},{id:'soundcraft-mixer',name:'Mixer',isActive:true}];
 const props={allItems:items,token:'t',onClose(){},onSaved(){},report(){}};
 const html=renderToStaticMarkup(createElement(EquipmentRoomPage,{...props,item:items[0]}));
 assert.match(html,/Place Speaker/);
 assert.match(html,/value="1.5"/);assert.match(html,/value="30"/);
 assert.match(html,/Use automatic position/);assert.match(html,/Save placement/);assert.match(html,/Loading the 3D room/);
 // an item with no placement starts from its automatic spot and cannot be reset
 const fresh=renderToStaticMarkup(createElement(EquipmentRoomPage,{...props,item:items[1]}));
 assert.match(fresh,/class="eq-place-auto" disabled/);
});

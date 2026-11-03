import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentSetMemberships,buildSetModelParts,setMembersFromItem,isEquipmentSet} from './equipmentSets.js';

test('set membership retains the saved set price and includes each equipment only once',()=>{
 const speaker={id:'speaker',name:'Speaker',modelUrl:'https://assets.test/speaker.glb'};
 const set={id:'bundle',name:'Sound bundle',priceCents:90000,modelParts:[{name:'Left speaker',src:speaker.modelUrl},{name:'Right speaker',src:speaker.modelUrl}]};
 const membership=equipmentSetMemberships([speaker,set,{id:'other',name:'Other'}]);
 assert.deepEqual(membership.get('speaker'),[set]);assert.equal(membership.get('speaker')[0].priceCents,90000);
 assert.deepEqual(membership.get('bundle'),[set]);assert.deepEqual(membership.get('other'),[]);
});
test('ambiguous shared models require a matching name and missing sources do not fabricate membership',()=>{
 const rows=[{id:'a',name:'A',modelUrl:'shared'},{id:'b',name:'B',modelUrl:'shared'},{id:'c',name:'C'},
 {id:'unknown',name:'Unknown set',modelParts:[{name:'Unknown',src:'shared'},{name:'C'}]},
 {id:'named',name:'Named set',modelParts:[{name:'B',src:'shared'}]}];
 const membership=equipmentSetMemberships(rows);
 assert.deepEqual(membership.get('a'),[]);assert.deepEqual(membership.get('b').map(set=>set.id),['named']);assert.deepEqual(membership.get('c'),[]);
});

test('explicit membership works without models and quantities expand only available 3D pieces',()=>{
 const speaker={id:'speaker',name:'Speaker',modelUrl:'/echo/models/speaker.glb'};
 const mic={id:'mic',name:'Mic'};
 const set={id:'set',isSet:true,setItems:[{equipmentId:'speaker',quantity:2},{equipmentId:'mic',quantity:1}]};
 assert.equal(isEquipmentSet(set),true);
 assert.deepEqual(equipmentSetMemberships([speaker,mic,set]).get('mic'),[set]);
 const members=setMembersFromItem(set,[speaker,mic]);
 const parts=buildSetModelParts(members,[speaker,mic]);
 assert.equal(parts.length,2);assert.equal(parts[0].x,0);assert.equal(parts[1].x,.75);assert.equal(parts[0].rotation,0);
 assert.equal(members.reduce((total,item)=>total+item.quantity,0),3);
});

test('mounted speaker groups retain their height when rebuilding set models',()=>{
 const rows=[{id:'pole',name:'Pole speaker',modelUrl:'/echo/models/pole.glb'}];
 const set={setItems:[{equipmentId:'pole',quantity:2,x:3,y:.535,z:0,rotation:0}]};
 const parts=buildSetModelParts(setMembersFromItem(set,rows),rows);
 assert.deepEqual(parts.map(({x,y,z})=>({x,y,z})),[{x:3,y:.535,z:0},{x:3.75,y:.535,z:0}]);
});

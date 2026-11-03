import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileEquipmentServices,isCatalogSet} from './rentalCatalog.js';
import {resolveDraftEquipment} from './draftEquipment.js';
const catalog=[{id:'sound',kind:'service',category:'sound',isActive:true},{id:'lighting',kind:'service',category:'lighting',isActive:true},{id:'special-service',kind:'service',category:'custom',isActive:true}];
const equipment=[{id:'speaker',category:'sound',minQuantity:1,availableQuantity:4},{id:'light',category:'lighting',minQuantity:2,availableQuantity:6},{id:'custom-item',category:'custom'},{id:'bundle',isSet:true,category:'sets',setItems:[{equipmentId:'speaker',quantity:2},{equipmentId:'light',quantity:2}]}];
test('sets infer every included service; removing equipment preserves unrelated manual selections',()=>{
 assert.equal(isCatalogSet(equipment[3]),true);
 assert.deepEqual(reconcileEquipmentServices(['dj'],{},{bundle:{quantity:1}},catalog,equipment),['dj','sound','lighting']);
 assert.deepEqual(reconcileEquipmentServices(['dj','sound','lighting'],{bundle:{quantity:1}},{light:{quantity:2}},catalog,equipment),['dj','lighting']);
 assert.deepEqual(reconcileEquipmentServices([],{},{'custom-item':{quantity:1}},catalog,equipment),['rental']);
});
test('AI equipment replacements use catalog names and enforce whole quantities, unique IDs, minimums and stock',()=>{
 assert.equal(resolveDraftEquipment([{id:'speaker',quantity:2,name:'Invented'}],equipment)[0].name,undefined);
 for(const rows of [[{id:'unknown',quantity:1}],[{id:'light',quantity:1}],[{id:'speaker',quantity:5}],[{id:'speaker',quantity:1.5}],[{id:'speaker',quantity:1},{id:'speaker',quantity:1}]])assert.throws(()=>resolveDraftEquipment(rows,equipment));
 assert.deepEqual(resolveDraftEquipment([],equipment),[]);
});

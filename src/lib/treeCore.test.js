import test from 'node:test';import assert from 'node:assert/strict';
import {treeAtoms,stepMounted,atomSource,stepsOf,withEquipmentCategoryIds,buildTreeNodes} from './treeCore.js';

test('every data atom is a node of the tree: an id, a step, a section and a source',()=>{
 const atoms=treeAtoms({dj:true,rental:true});
 assert.ok(atoms.length>=35,`${atoms.length} atoms`);
 assert.equal(new Set(atoms.map(atom=>atom.id)).size,atoms.length,'ids are unique');
 for(const atom of atoms){assert.ok(atom.step>=1&&atom.step<=5,atom.id);assert.match(atom.code,/^\d\d\.\d\d\.\d\d/);assert.ok(['services','events','music','client','account'].includes(atom.branch),atom.id);}
 assert.equal(atoms.find(atom=>atom.id==='event.type').branch,'events');
 assert.deepEqual(atomSource('music.djRequested'),{branch:'services',ref:'dj'});
});

test('atoms of a step exist only while the tree has that step',()=>{
 const noDj=treeAtoms({dj:false,rental:true}),noRental=treeAtoms({dj:true,rental:false});
 assert.ok(noDj.filter(atom=>atom.step===3).every(atom=>!atom.mounted)&&noDj.filter(atom=>atom.step!==3).every(atom=>atom.mounted));
 assert.ok(noRental.filter(atom=>atom.step===4).every(atom=>!atom.mounted));
 assert.equal(stepMounted(3,{dj:false,rental:true}),false);assert.equal(stepMounted(2,{dj:false,rental:false}),true);
});

test('steps follow the service ids, equipment follows equipmentCategoryId, removed ids keep their place',()=>{
 const catalog=[{kind:'service',id:'dj',name:'DJ'},{kind:'service',id:'sound',name:'Sound',category:'sound',sortOrder:1}];
 assert.deepEqual(stepsOf(catalog),{dj:true,mc:false,rental:true,djName:'DJ',djNameAr:''});
 const equipment=withEquipmentCategoryIds(catalog,[{id:'a',category:'sound'},{id:'b',category:'x',equipmentCategoryId:'dj'}]);
 assert.deepEqual(equipment.map(row=>row.equipmentCategoryId),['sound','dj']);
 const {nodes}=buildTreeNodes({services:catalog.filter(row=>row.id==='sound'),equipment,removed:{items:[{id:'mc',sortOrder:0}],equipment:[{id:'lectern',equipmentCategoryId:'mc'}]}});
 assert.deepEqual(nodes.map(node=>node.id),['mc','sound']);assert.deepEqual(nodes[0].removedItems.map(row=>row.id),['lectern']);assert.equal(nodes[0].removed,true);
});

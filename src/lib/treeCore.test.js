import test from 'node:test';import assert from 'node:assert/strict';
import {treeAtoms,stepMounted,atomSource,stepsOf,withEquipmentCategoryIds,buildTreeNodes} from './treeCore.js';

test('every data atom is a node of the tree: an id, a step, a section and a source',()=>{
 const atoms=treeAtoms({dj:true,rental:true});
 assert.ok(atoms.length>=34,`${atoms.length} atoms`);
 assert.equal(new Set(atoms.map(atom=>atom.id)).size,atoms.length,'ids are unique');
 for(const atom of atoms){assert.ok(atom.step>=1&&atom.step<=5,atom.id);assert.match(atom.code,/^\d\d\.\d\d\.\d\d/);assert.ok(['services','events','music','client','account'].includes(atom.branch),atom.id);}
 assert.equal(atoms.find(atom=>atom.id==='event.type').branch,'events');
 assert.deepEqual(atomSource('music.djRequested'),{branch:'services',ref:'dj'});
});

test('atoms of a step exist only while the tree has the service of their section',()=>{
 // The Booking Tree says which section needs which service (sectionDefinitions.requiresAny): 03.01–03.02 the DJ, 03.03 the MC, 03.04 rentals. Everything else always exists.
 const sectionOf=atom=>atom.section,mounted=steps=>new Set(treeAtoms(steps).filter(atom=>atom.mounted).map(sectionOf));
 const all=mounted({dj:true,mc:true,rental:true});
 assert.ok(['03.01','03.02','03.03','03.04','03.09','01.01','04.01'].every(code=>all.has(code)));
 const noDj=mounted({dj:false,mc:true,rental:true}),noMc=mounted({dj:true,mc:false,rental:true}),noRental=mounted({dj:true,mc:true,rental:false});
 assert.ok(!noDj.has('03.01')&&!noDj.has('03.02')&&noDj.has('03.03')&&noDj.has('03.04'));
 assert.ok(!noMc.has('03.03')&&noMc.has('03.01'));
 assert.ok(!noRental.has('03.04')&&noRental.has('03.01')&&noRental.has('03.03'));
 assert.equal(stepMounted(3,{dj:false,mc:false,rental:false}),false);assert.equal(stepMounted(2,{dj:false,mc:false,rental:false}),true);
});

test('steps follow the service ids, equipment follows equipmentCategoryId, removed ids keep their place',()=>{
 const catalog=[{kind:'service',id:'dj',name:'DJ'},{kind:'service',id:'sound',name:'Sound',category:'sound',sortOrder:1}];
 assert.deepEqual(stepsOf(catalog),{dj:true,mc:false,rental:true,djName:'DJ',djNameAr:''});
 const equipment=withEquipmentCategoryIds(catalog,[{id:'a',category:'sound'},{id:'b',category:'x',equipmentCategoryId:'dj'}]);
 assert.deepEqual(equipment.map(row=>row.equipmentCategoryId),['sound','dj']);
 const {nodes}=buildTreeNodes({services:catalog.filter(row=>row.id==='sound'),equipment,removed:{items:[{id:'mc',sortOrder:0}],equipment:[{id:'lectern',equipmentCategoryId:'mc'}]}});
 assert.deepEqual(nodes.map(node=>node.id),['mc','sound']);assert.deepEqual(nodes[0].removedItems.map(row=>row.id),['lectern']);assert.equal(nodes[0].removed,true);
});

import test from 'node:test';import assert from 'node:assert/strict';import {equipmentQuantity,layoutEquipment} from './simulationLayout.js';
test('quantity controls respect known stock, unavailability and minimums',()=>{assert.equal(equipmentQuantity({availableQuantity:2},8),2);assert.equal(equipmentQuantity({availabilityStatus:'unavailable'},1),0);assert.equal(equipmentQuantity({minQuantity:2,availableQuantity:5},1),2);assert.equal(equipmentQuantity({},-1),0);assert.equal(equipmentQuantity({},0),0);});
test('layout places selected units, supplies a table and bounds large orders',()=>{const layout=layoutEquipment([{id:'soundcraft',quantity:1},{id:'qsc-k122',quantity:2}],8,6);assert.equal(layout.units.length,3);assert.equal(layout.table,true);assert.equal(layout.units[0].y,.94);assert.equal(layout.units[1].x,-layout.units[2].x);assert.equal(layoutEquipment([{id:'qsc-k122',quantity:100}]).omitted,40);for(const unit of layout.units){assert.ok(Math.abs(unit.x)<4);assert.ok(Math.abs(unit.z)<3);}});
test('guest layout is deterministic, avoids the stage and bounds large crowds',async()=>{const {layoutGuests}=await import('./simulationLayout.js');const guests=layoutGuests(80,16,12);assert.equal(guests.people.length,80);for(const person of guests.people){assert.ok(person.z>-6+3.5);assert.ok(person.z<6);assert.ok(Math.abs(person.x)<8);}assert.deepEqual(guests,layoutGuests(80,16,12));assert.equal(layoutGuests(500,20,20).omitted,260);assert.equal(layoutGuests(null,10,8).shown,0);});

import {layoutEquipment as layoutWithPlacement} from './simulationLayout.js';
test('an admin placement replaces the automatic position, measured from the back wall',()=>{
 const auto=layoutWithPlacement([{id:'jbl-speaker',quantity:1}],10,8).units[0];
 const placed=layoutWithPlacement([{id:'jbl-speaker',quantity:2,roomPlacement:{x:1.5,fromBack:2,rotation:90,height:0}}],10,8).units;
 assert.notEqual(auto.x,1.5);
 assert.equal(placed[0].x,1.5);assert.equal(placed[0].z,-8/2+2);assert.ok(Math.abs(placed[0].rot-Math.PI/2)<1e-9);
 assert.ok(placed[1].x>placed[0].x);
 // a bigger room keeps the item the same distance from the back wall
 assert.equal(layoutWithPlacement([{id:'jbl-speaker',quantity:1,roomPlacement:{x:0,fromBack:2,rotation:0,height:0}}],20,30).units[0].z,-30/2+2);
});

import {layoutRoomZones} from './simulationLayout.js';
test('guests sit at oval tables of 5 to 8 in the dining area, some dance, and nobody stands on the stage or the dance floor by accident',()=>{
 const everyone=layoutRoomZones(60,40,30);assert.ok(everyone.tables.every(table=>table.chairs.length>=5&&table.chairs.length<=8)); // 5 to 8 seats per table
 assert.ok(new Set(everyone.tables.map(table=>table.chairs.length)).size>1); // not all the same
 assert.equal(everyone.seated.length+everyone.dancers.length,60);assert.ok(everyone.seatsAvailable>=60);assert.ok(everyone.seated.length<everyone.seatsAvailable); // the dancers' chairs are empty
 const zones=layoutRoomZones(60,14,12);
 assert.equal(zones.shown+zones.omitted,60);
 assert.ok(zones.dancers.length>0&&zones.seated.length>0);
 assert.ok(zones.tables.every(table=>table.guests<=table.chairs.length&&table.z>zones.dance.z+zones.dance.d/2)); // tables are in front of the dance floor
 assert.ok(zones.dance.z-zones.dance.d/2>zones.stageEnd); // the dance floor is in front of the stage
 for(const person of zones.dancers)assert.ok(Math.abs(person.x)<=zones.dance.w/2&&Math.abs(person.z-zones.dance.z)<=zones.dance.d/2);
 assert.equal(zones.seated.length,zones.tables.reduce((sum,table)=>sum+table.guests,0));
 // a small room cannot seat everyone: the rest is reported, never drawn outside the room
 const small=layoutRoomZones(200,10,8);assert.ok(small.omitted>0);assert.equal(small.shown+small.omitted,200);
 assert.equal(layoutRoomZones(0,14,12).shown,0);
});

import {recommendedRoomSize} from './simulationLayout.js';
test('the room grows with the guest list until everyone has a place, and never shrinks below 14 x 12 m',()=>{
 assert.deepEqual(recommendedRoomSize(0),{width:14,depth:12});
 let last=0;
 for(const guests of [20,60,120,250,400]){const size=recommendedRoomSize(guests),area=size.width*size.depth;assert.ok(area>=last);last=area;assert.equal(layoutRoomZones(guests,size.width,size.depth).omitted,0,`${guests} guests`);}
 assert.ok(recommendedRoomSize(400).depth>recommendedRoomSize(60).depth);
});

test('the hosts can set the number of columns and tables, tables are numbered in order, and named guests sit at their table',()=>{
 const zones=layoutRoomZones(40,40,30,{columns:5,tables:7,seated:[3,0,6]});
 assert.equal(zones.columns.length,5);assert.equal(zones.tables.length,7);
 assert.deepEqual(zones.tables.map(table=>table.number),[1,2,3,4,5,6,7]);
 assert.deepEqual(zones.tables.map(table=>table.guests).slice(0,3),[3,0,Math.min(6,zones.tables[2].chairs.length)]);
 assert.equal(layoutRoomZones(40,40,30,{columns:0}).columns.length,0);
 assert.equal(layoutRoomZones(40,40,30,{tables:0}).tables.length,0);
});

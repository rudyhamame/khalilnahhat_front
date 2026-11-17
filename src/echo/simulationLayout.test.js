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
test('every guest starts seated at a table, guests are divided evenly between the tables, and nobody stands on the stage or the dance floor',()=>{
 const everyone=layoutRoomZones(60,40,30),counts=everyone.tables.map(table=>table.guests);
 assert.equal(everyone.seated.length,60);assert.equal(everyone.dancers.length,0);
 assert.ok(Math.max(...counts)-Math.min(...counts)<=1); // an even split
 assert.ok(everyone.tables.every(table=>table.chairs.length===Math.max(2,table.guests))); // chairs follow the guests, no 5 to 8 rule
 const zones=layoutRoomZones(60,14,12);
 assert.equal(zones.shown+zones.omitted,60);
 assert.ok(zones.tables.every(table=>table.guests<=table.chairs.length&&table.z>zones.dance.z+zones.dance.d/2)); // tables are in front of the dance floor
 assert.ok(zones.dance.z-zones.dance.d/2>zones.stageEnd); // the dance floor is in front of the stage
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

test('the hosts can set the number of columns, tables and guests per table; the rest of the guests are shared evenly between the other tables',()=>{
 const zones=layoutRoomZones(40,40,30,{columns:5,tables:7,seated:[3,0,6]});
 assert.equal(zones.columns.length,5);assert.equal(zones.tables.length,7);
 assert.deepEqual(zones.tables.map(table=>table.number),[1,2,3,4,5,6,7]);
 assert.deepEqual(zones.tables.map(table=>table.guests),[3,0,6,8,8,8,7]);
 assert.equal(layoutRoomZones(40,40,30,{columns:0}).columns.length,0);
 assert.equal(layoutRoomZones(40,40,30,{tables:0}).tables.length,0);
});

test('dance carpet grows with the booked guest count instead of staying a fixed-size rectangle',async()=>{
 const {danceFloorSize}=await import('./simulationLayout.js');
 const sizes=[20,120,300].map(count=>danceFloorSize(count,60,50));
 assert.ok(sizes[1].w>sizes[0].w&&sizes[1].d>sizes[0].d);
 assert.ok(sizes[2].w>sizes[1].w&&sizes[2].d>sizes[1].d);
 for(const [index,count] of [20,120,300].entries())assert.ok(sizes[index].capacity>=count);
 assert.deepEqual(danceFloorSize(120,60,50),sizes[1]);
});
test('automatic room sizing fits the guest-sized carpet, seats and dancers clear of the stage',async()=>{
 const {recommendedRoomSize}=await import('./simulationLayout.js');
 for(const count of [1,60,120,300,500]){
  const room=recommendedRoomSize(count),zones=layoutRoomZones(count,room.width,room.depth),floor=zones.dance;
  assert.equal(zones.omitted,0,`${count} guests`);assert.ok(zones.seatsAvailable>=count);
  assert.ok(floor.capacity>=count);assert.ok(floor.z-floor.d/2>zones.stageEnd);
  assert.ok(floor.w<room.width&&floor.z+floor.d/2<room.depth/2);
  for(const guest of zones.dancers){assert.ok(Math.abs(guest.x)<floor.w/2);assert.ok(Math.abs(guest.z-floor.z)<floor.d/2);}
  for(const table of zones.tables)assert.ok(table.z>floor.z+floor.d/2);
 }
});
test('a manually constrained room bounds the carpet instead of spilling outside the room',async()=>{
 const {danceFloorSize}=await import('./simulationLayout.js');
 const floor=danceFloorSize(500,8,8),zones=layoutRoomZones(500,8,8);
 assert.ok(floor.w>0&&floor.w<8&&floor.d>0&&floor.d<8);
 assert.ok(floor.capacity<500);assert.ok(zones.omitted>0);
 assert.ok(zones.dance.z+zones.dance.d/2<4);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentTable,equipmentStockProblems} from './equipmentReply.js';
import {bookingStage,declinesOptionalExtras} from './bookingStage.js';
import {createEventOrder} from './eventOrderCore.mjs';
const catalog=[{id:'lectern',name:'Lectern',nameAr:'منصة',availabilityStatus:'available',availableQuantity:2},{id:'smoke',name:'Smoke machine',availabilityStatus:'unavailable',availableQuantity:0},{id:'mics',name:'Mic | pair',availabilityStatus:'on_request',availableQuantity:null}];
test('the saved equipment becomes an Item | Qty table, in the client\'s language',()=>{
 assert.equal(equipmentTable([{id:'lectern',quantity:1},{id:'mics',quantity:2},{id:'x',quantity:0}],catalog),'\n\n| Item | Qty |\n| --- | --- |\n| Lectern | 1 |\n| Mic / pair | 2 |');
 assert.match(equipmentTable([{id:'lectern',quantity:1}],catalog,true),/\| المعدات \| الكمية \|[^]*\| منصة \| 1 \|/);
 assert.equal(equipmentTable([],catalog),'');assert.equal(equipmentTable('nope',catalog),'');
});
test('stock problems are plain sentences: out of stock, or more than is in stock; unknown stock is fine',()=>{
 assert.deepEqual(equipmentStockProblems([{id:'lectern',quantity:2},{id:'mics',quantity:9},{id:'new',quantity:1}],catalog),[]);
 assert.deepEqual(equipmentStockProblems([{id:'lectern',quantity:3}],catalog),["We have 2 Lectern in stock, so I can't add 3."]);
 assert.deepEqual(equipmentStockProblems([{id:'smoke',quantity:1}],catalog),['Smoke machine is out of stock right now.']);
});
test('the booking stage and the decline of optional extras are explicit',()=>{
 assert.equal(bookingStage(createEventOrder()),'required');
 for(const text of ['No','nothing more.','That’s all!','لا'])assert.equal(declinesOptionalExtras(text),true);
 for(const text of ['no, add a lectern','Yes please',''])assert.equal(declinesOptionalExtras(text),false);
});

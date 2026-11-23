import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingSections} from './bookingSections.js';
const rentals=[{id:'mc',selectionField:'music.mcRequested',bookingServiceId:'rental',equipment:[]},{id:'sound',selectionField:'',bookingServiceId:'sound',equipment:[{id:'k12'}]},{id:'booth',selectionField:'',bookingServiceId:'rental',equipment:[{id:'cam'}]}];
test('DJ and rental services are separate sections',()=>{
 const result=bookingSections({services:['dj','sound'],music:{mcRequested:true},equipment:[{id:'cam',quantity:2}]},rentals);
 assert.equal(result.dj,true);
 assert.deepEqual(result.rentals.map(row=>[row.id,row.on]),[['mc',true],['sound',true],['booth',true]]);
 assert.equal(result.rentals[2].equipment[0].quantity,2);
 assert.equal(bookingSections({},rentals).dj,false);
 assert.equal(bookingSections({},rentals).rentals.some(row=>row.on),false);
});

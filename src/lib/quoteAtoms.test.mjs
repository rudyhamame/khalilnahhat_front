import test from 'node:test';import assert from 'node:assert/strict';
import {quoteAtomCode,sortQuoteLines,quoteLineName} from './quoteAtoms.js';
const catalog=[{id:'mc',kind:'service',isActive:true,selectionField:'music.mcRequested'},{id:'sound',kind:'service',isActive:true},{id:'lighting',kind:'service',isActive:true}];
const equipment=[{id:'speaker',equipmentCategoryId:'sound'},{id:'mic',equipmentCategoryId:'sound'},{id:'uplights',equipmentCategoryId:'lighting'}];
test('quote lines map to their data atom code',()=>{
 assert.equal(quoteAtomCode({serviceId:'svc-dj'}),'03.01.01');
 assert.equal(quoteAtomCode({serviceId:'svc-mc'}),'03.01.02');
 assert.equal(quoteAtomCode({serviceId:'mic'},catalog,equipment),'04.02.02');
 assert.equal(quoteAtomCode({serviceId:'uplights'},catalog,equipment),'04.03.01');
 assert.equal(quoteAtomCode({serviceId:'svc-sound'},catalog,equipment),'');
 assert.deepEqual(sortQuoteLines([{serviceId:'svc-sound'},{serviceId:'uplights'},{serviceId:'svc-dj'}],catalog,equipment).map(row=>row.line.serviceId),['svc-dj','uplights','svc-sound']);
});
test('service lines show names, not ids',()=>{
 const named=[{id:'dj',kind:'service',name:'DJ Khalil Nahhat'}];
 assert.equal(quoteLineName({serviceId:'svc-dj',name:'dj'},named),'DJ Khalil Nahhat');
 assert.equal(quoteLineName({serviceId:'svc-dj',name:'dj'}),'DJ service');
 assert.equal(quoteLineName({serviceId:'svc-mc',name:'mc'}),'MC hosting');
 assert.equal(quoteLineName({serviceId:'svc-led-wall',name:'led-wall'}),'Led wall');
 assert.equal(quoteLineName({serviceId:'mic',name:'Vocal microphones'}),'Vocal microphones');
});

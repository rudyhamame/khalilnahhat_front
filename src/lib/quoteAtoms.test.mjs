import test from 'node:test';import assert from 'node:assert/strict';
import {quoteAtomCode,sortQuoteLines} from './quoteAtoms.js';
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

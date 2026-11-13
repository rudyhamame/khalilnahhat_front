import test from 'node:test';import assert from 'node:assert/strict';
import {areaFromAddress,gtaFromPostal,isGta} from './addressSearch.js';
test('the GTA answer follows the city or postal code; unknown postal codes never answer "outside"',()=>{
  assert.equal(gtaFromPostal('M5V 2T6'),'gta');assert.equal(gtaFromPostal('l5b3c2'),'gta');assert.equal(gtaFromPostal('L6P1A1'),'gta');
  assert.equal(gtaFromPostal('L9T 1A1'),'gta');assert.equal(gtaFromPostal('L9K 1A1'),null);assert.equal(gtaFromPostal('K1A0B1'),null);assert.equal(gtaFromPostal(''),null);
  assert.equal(areaFromAddress({city:'Mississauga'}),'gta');assert.equal(areaFromAddress({city:'Ottawa',postalCode:'K1A 0B1'}),'outside_gta');
  assert.equal(areaFromAddress({city:'Ot'}),null);assert.equal(areaFromAddress({city:'Ottawa',postalCode:'M5V 2T6'}),'gta');assert.equal(isGta('Richmond Hill'),true);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ATOM_KEYS,fieldCode} from './eventPageModel.js';
import {treeAtoms} from './treeCore.js';

test('Booking atom seeds use one synchronized contract and include every numbered atom',()=>{
 const front=JSON.parse(readFileSync(new URL('./contracts/booking-atoms.json',import.meta.url)));
 const back=JSON.parse(readFileSync(new URL('../../../khalil-back/contracts/booking-atoms.json',import.meta.url)));
 assert.deepEqual(front,back);
 const keys=front.sections.flatMap(([,keys])=>keys);assert.deepEqual(keys,ATOM_KEYS);
 const atoms=treeAtoms({dj:false,rental:false},{includeMetadata:true});assert.deepEqual(atoms.map(atom=>atom.id),ATOM_KEYS);
 for(const atom of atoms)assert.equal(atom.code,fieldCode(atom.id));
 assert.ok(atoms.find(atom=>atom.id==='event.venue.sourceAttribution'));
 assert.equal(atoms.find(atom=>atom.id==='music.genres').mounted,false);
});

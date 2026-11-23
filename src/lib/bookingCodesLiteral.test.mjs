import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import contract from './contracts/booking-atoms.json' with {type:'json'};

// Every literal <FieldCode code="…"/> in the UI must be an atom, a section, or a range of atoms that exists in the contract.
const known=new Set(), sections=new Set();
for(const [s,keys] of contract.sections){sections.add(s);keys.forEach((_,i)=>known.add(`${s}.${String(i+1).padStart(2,'0')}`));}
test('literal FieldCode codes exist in the booking atom contract',()=>{
 const dir=new URL('../echo/',import.meta.url);
 for(const f of readdirSync(dir).filter(f=>f.endsWith('.jsx'))){
  for(const [,code] of readFileSync(new URL(f,dir),'utf8').matchAll(/<FieldCode code="([^"]+)"/g)){
   const [from,to]=code.split('–'), base=from.split('.').slice(0,2).join('.');
   assert.ok(known.has(from)||sections.has(from),`${f}: ${code} is not in the contract`);
   if(to) assert.ok(known.has(`${base}.${to}`),`${f}: ${code} range end is not in the contract`);
  }
 }
});

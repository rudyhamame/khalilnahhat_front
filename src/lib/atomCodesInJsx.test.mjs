// Every literal FieldCode code in the pages must exist in the shared booking-atoms contract (ranges like 02.04.01–07 included).
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
import contract from './contracts/booking-atoms.json' with {type:'json'};
const known=new Set(contract.sections.flatMap(([s,keys])=>keys.map((_,i)=>`${s}.${String(i+1).padStart(2,'0')}`)));
test('literal atom codes in JSX exist in the contract',()=>{
 const dir=new URL('../echo/',import.meta.url);
 for(const f of readdirSync(dir).filter(n=>n.endsWith('.jsx'))) for(const [,a,b] of readFileSync(new URL(f,dir),'utf8').matchAll(/<FieldCode code="(\d\d\.\d\d\.\d\d)(?:–(\d\d))?"/g)){
  const [s,e,n]=a.split('.');assert.ok(known.has(a),`${f}: ${a}`);if(b)assert.ok(known.has(`${s}.${e}.${b}`),`${f}: ${s}.${e}.${b}`);
 }
});

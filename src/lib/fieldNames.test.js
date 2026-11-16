import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aiFields,fieldName} from './eventOrderCore.mjs';

// Duplication guard: a field's short name (English and Arabic) lives in the contract, nowhere else.
// Summary screens call fieldName(); they never type the name again.
const summaryScreens=['../echo/BookingCart.jsx','../echo/HomeAvailability.jsx','./bookingDraftSummary.js','../components/AdminServicesPanel.jsx'];

test('every field has a short name in both languages',()=>{
 for(const field of aiFields){
  assert.ok(fieldName(field.key)&&fieldName(field.key,true),field.key);
 }
});

test('summary screens never retype a field name that the contract already owns',()=>{
 const retyped=[];
 for(const file of summaryScreens){
  const source=readFileSync(new URL(file,import.meta.url),'utf8');
  for(const field of aiFields)if(source.includes(`'${field.short}','${field.shortAr}'`))retyped.push(`${file}: "${field.short}" (${field.key}) — use fieldName('${field.key}')`);
 }
 assert.deepEqual(retyped,[]);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {fieldQuestion} from './fieldQuestion.js';
test('booking questions read naturally and never double the question mark',()=>{
  assert.equal(fieldQuestion({key:'customer.contactMethod',label:'How should we reach you?',options:['email','phone','whatsapp']}),'How should we reach you — Email, Phone or WhatsApp?');
  assert.equal(fieldQuestion({label:'Is the venue inside the GTA (Greater Toronto Area)?',options:['gta','outside_gta']}),'Is the venue inside the GTA (Greater Toronto Area) — Inside the GTA or Outside the GTA?');
  assert.equal(fieldQuestion({label:'Venue name'}),'What would you like for Venue name?');
  assert.equal(fieldQuestion({label:'What time?'}),'What time?');
  assert.equal(fieldQuestion({label:'Company name',ar:'اسم الشركة؟'},true),'اسم الشركة؟');
  for(const label of ['How should we reach you?','Venue name?','Phone??'])assert.ok(!fieldQuestion({label}).includes('??'));
});

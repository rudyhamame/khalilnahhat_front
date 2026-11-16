import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCanadianPhoneInput as format,formatCanadianPhoneEdit as edit} from './canadianPhone.js';

test('phone formats progressively while typing and clears completely',()=>{
 let value='';
 for(const digit of '4165550123'){
  const result=edit(value,value+digit,value.length+1,'insertText');
  value=result.value;assert.equal(result.caret,value.length);
 }
 assert.equal(value,'+1 (416) 555-0123');
 for(let i=0;value&&i<20;i++)value=edit(value,value.slice(0,-1),value.length-1,'deleteContentBackward').value;
 assert.equal(value,'');
 assert.equal(format('416'),'+1 (416');assert.equal(format('4165'),'+1 (416) 5');
});
test('pasting and formatting again preserve the Canadian number',()=>{
 for(const input of ['4165550123','14165550123','+1 (416) 555-0123'])assert.equal(format(input),'+1 (416) 555-0123');
 assert.equal(format('+44 20 7946 0958'),'+44 20 7946 0958');
});
test('deleting separators removes adjacent digits and middle edits retain the caret',()=>{
 assert.equal(edit('+1 (416) 555-0123','+1 (416) 5550123',12,'deleteContentBackward').value,'+1 (416) 550-123');
 const result=edit('+1 (416) 555-0123','+1 (426) 555-0123',6,'insertText');
 assert.deepEqual(result,{value:'+1 (426) 555-0123',caret:6});
 assert.equal(edit('+1 (416) 555-0123','',0,'deleteContentBackward').value,'');
});

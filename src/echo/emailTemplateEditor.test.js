import test from 'node:test';
import assert from 'node:assert/strict';
import {emailDetailLabel,templateSegments,missingEmailDetails,readEmailEditor} from './emailTemplateEditor.js';
const text=value=>({nodeType:3,textContent:value});
const el=(tagName,childNodes=[],dataset={})=>({nodeType:1,tagName,childNodes,dataset});
test('readable details preserve API placeholders without HTML or Markdown',()=>{
 const body='Hello {{recipientName}},\n\nYour {{ requestId }} is ready.';
 const parts=templateSegments(body);
 assert.deepEqual(parts.filter(part=>part.variable).map(part=>part.variable),['recipientName','requestId']);
 assert.equal(emailDetailLabel('requestId'),'Request number');
 assert.deepEqual(missingEmailDetails(body,['requestId','details']),['details']);
 const tree=el('DIV',[text('Hello '),el('SPAN',[text('Recipient name')],{emailDetail:'recipientName'}),text(',\n\n'),text('<script>alert(1)</script>')]);
 assert.equal(readEmailEditor(tree),'Hello {{recipientName}},\n\n<script>alert(1)</script>');
});
test('browser paragraphs and empty lines serialize as ordinary line breaks',()=>{
 assert.equal(readEmailEditor(el('DIV',[text('First'),el('DIV',[text('Second')])])),'First\nSecond');
 assert.equal(readEmailEditor(el('DIV',[el('DIV',[text('First')]),el('DIV',[el('BR')]),el('DIV',[text('Third')])])),'First\n\nThird');
 assert.equal(readEmailEditor(el('DIV',[text('First'),el('DIV',[el('BR')])])),'First\n');
 assert.equal(readEmailEditor(el('DIV',[el('BR')])),'');
});

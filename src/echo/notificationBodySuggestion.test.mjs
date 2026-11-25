import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestNotificationBody} from './notificationBodySuggestion.mjs';
const item={id:'password-reset',subject:'Reset password',body:'Hello {{recipientName}}. Reset here: {{actionUrl}}',variables:['recipientName','actionUrl'],required:['actionUrl'],leadHours:null};
const draft={revision:0,subject:item.subject,body:item.body,enabled:true,imageUrl:'',leadHours:null};
const valid='Hello {{recipientName}},\n\nPlease reset your password: {{actionUrl}}';

test('uses the notification suggestion endpoint when supported',async()=>{
 const calls=[];const result=await suggestNotificationBody(item,draft,{token:'test',request:async(path,options)=>{calls.push({path,...options});return {body:valid};}});
 assert.deepEqual(result,{body:valid});assert.equal(calls.length,1);assert.match(calls[0].path,/suggest-body$/);assert.equal(calls[0].token,'test');assert.deepEqual(calls[0].body,{subject:item.subject,body:item.body});
});
test('a missing route uses the existing email AI service and returns only the body',async()=>{
 const calls=[];const result=await suggestNotificationBody(item,draft,{token:'test',request:async(path,options)=>{calls.push({path,...options});if(calls.length===1)throw Object.assign(new Error('Route not found'),{status:404});return {subject:'AI subject should be ignored',body:valid};}});
 assert.equal(calls.length,2);assert.equal(calls[1].path,'/admin/ai/email-polish');assert.deepEqual(calls[1].body,{subject:item.subject,text:item.body});assert.deepEqual(result,{body:valid});assert.equal(draft.subject,item.subject);assert.equal(draft.body,item.body);
});
test('blank messages seed the fallback from the saved template',async()=>{
 let seed;await suggestNotificationBody(item,{...draft,subject:'',body:'   '},{request:async(path,options)=>{if(path.endsWith('/suggest-body'))throw Object.assign(new Error(),{status:404});seed=options.body;return {body:valid};}});
 assert.deepEqual(seed,{subject:item.subject,text:item.body});
});
test('authorization, provider limits and server failures never retry against another endpoint',async()=>{
 for(const status of [401,403,429,502,503]){
  let calls=0;const error=Object.assign(new Error('Provider unavailable'),{status});
  await assert.rejects(suggestNotificationBody(item,draft,{request:async()=>{calls++;throw error;}}),error);assert.equal(calls,1);
 }
});
test('both paths reject missing, invented, malformed or HTML details without changing the draft',async()=>{
 for(const fallback of [false,true])for(const body of ['', '{{actionUrl}}','{{recipientName}}','{{recipientName}} {{actionUrl}} {{unknown}}','{{recipientName}} {{actionUrl}} {{broken','<p>{{recipientName}} {{actionUrl}}</p>']){
  await assert.rejects(suggestNotificationBody(item,draft,{request:async path=>{if(fallback&&path.endsWith('/suggest-body'))throw Object.assign(new Error(),{status:404});return {body};}}),/draft is unchanged/);
 }
 assert.equal(draft.body,item.body);
});

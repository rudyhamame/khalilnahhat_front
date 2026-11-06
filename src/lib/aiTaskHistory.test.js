import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatAiDraftTask,presentAiTask,resolveAiTaskChange,aiTaskNoteText} from './aiTaskPresentation.js';
import {aiTaskHistoryKey,readAiTaskHistory,saveAiTaskHistory} from './aiTaskHistory.js';

const memory=()=>{const rows=new Map();return {getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,value)};};
test('past edits and their reviews survive reopening, including more than 30 entries',()=>{
 const storage=memory(),key=aiTaskHistoryKey('alice','draft-a');
 const past=Array.from({length:45},(_,index)=>({id:'task-'+index,label:'Guests: '+(index+1),confirmed:index%2===0,createdAt:'2026-11-05T23:00:00.000Z',sessionId:'earlier'}));
 assert.equal(saveAiTaskHistory(key,past,storage),true);
 const loaded=readAiTaskHistory(key,storage);assert.deepEqual(loaded,past);
 const next=[...loaded,{id:'new',label:'Event: wedding',confirmed:null,sessionId:'current'}];
 assert.equal(saveAiTaskHistory(key,next,storage),true);assert.equal(readAiTaskHistory(key,storage).length,46);
 assert.equal(readAiTaskHistory(key,storage)[0].confirmed,true);assert.equal(readAiTaskHistory(key,storage).at(-1).confirmed,null);
});
test('task histories remain isolated between accounts and drafts',()=>{
 const storage=memory();saveAiTaskHistory(aiTaskHistoryKey('alice','draft-a'),[{id:'private',label:'Event: wedding',confirmed:true}],storage);
 assert.deepEqual(readAiTaskHistory(aiTaskHistoryKey('bob','draft-a'),storage),[]);
 assert.deepEqual(readAiTaskHistory(aiTaskHistoryKey('alice','draft-b'),storage),[]);
 assert.deepEqual(readAiTaskHistory(aiTaskHistoryKey(null,'draft-a'),storage),[]);
});
test('corrupt history and unavailable browser storage fail gracefully',()=>{
 const storage=memory();storage.setItem('broken','not JSON');assert.deepEqual(readAiTaskHistory('broken',storage),[]);
 assert.equal(saveAiTaskHistory('blocked',[],{setItem(){throw Error('Quota exceeded');}}),false);
 storage.setItem('mixed',JSON.stringify([{id:'a',label:'Event: wedding',confirmed:false},{id:'a',label:'Duplicate',confirmed:true},{id:'bad',label:'Unknown review',confirmed:'yes'}]));
 assert.deepEqual(readAiTaskHistory('mixed',storage),[{id:'a',label:'Event: wedding',confirmed:false}]);
});


test('task summaries use concise field names and readable option values, including saved history',()=>{
 assert.deepEqual(formatAiDraftTask({path:'event.type',value:'wedding'}),{path:'event.type',value:'wedding',field:'Event',valueText:'Wedding',label:'Event: Wedding'});
 assert.equal(formatAiDraftTask({path:'event.guestCount',value:150}).label,'Guests: 150');
 assert.equal(formatAiDraftTask({path:'event.startTime',value:'18:00'}).label,'Start time: 6:00 PM');
 const old={id:'old',label:'What kind of event is it?: wedding',confirmed:false};
 assert.deepEqual(presentAiTask(old),{field:'Event',value:'Wedding',label:'Event: Wedding'});assert.equal(old.confirmed,false);assert.equal(old.label,'What kind of event is it?: wedding');
 assert.equal(formatAiDraftTask({path:'customer.fullName',value:'McDonald'}).valueText,'McDonald');
 assert.equal(formatAiDraftTask({path:'customer.email',value:'Name@example.com'}).valueText,'Name@example.com');
});


test('legacy task confirmations resolve exact values and old feedback renders as a note',()=>{
 assert.deepEqual(resolveAiTaskChange({label:'What kind of event is it?: wedding'}),{path:'event.type',value:'wedding'});
 assert.deepEqual(resolveAiTaskChange(formatAiDraftTask({path:'event.guestCount',value:150})),{path:'event.guestCount',value:150});
 assert.equal(resolveAiTaskChange({path:'event.type',value:'unknown',label:'Event: Unknown'}),null);
 assert.equal(aiTaskNoteText('My review of this AI action: {"task":"What kind of event is it?: wedding","confirmed":true}','Rudy'),'Event: Wedding confirmed by Rudy');
 assert.equal(aiTaskNoteText('Can you help me?','Rudy'),null);
});

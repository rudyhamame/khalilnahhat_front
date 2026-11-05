import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real handlers with fake capture and API adapters. No real audio,
// messages, or administrator account is created or modified.
function fixture(){
 const slots=[],effects=[],recorders=[],tracks=[],sent=[],removed=[],edits=[];
 let cursor=0,confirm=true,failDelete=false,failEdit=false,rows=[];
 class Recorder{
  static isTypeSupported(type){return type.startsWith('audio/webm');}
  constructor(){this.state='inactive';this.mimeType='audio/webm;codecs=opus';recorders.push(this);}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['fixture audio'],{type:this.mimeType})});this.finished=this.onstop?.();}
 }
 class Reader{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result=`data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`;this.onload();});}}
 const full=fs.readFileSync(new URL('./EchoProjectChat.jsx',import.meta.url),'utf8');
 const source=full.slice(full.indexOf('const fileData'),full.indexOf('export default function'))+full.slice(full.indexOf('function AdminProjectChat'),full.indexOf('\n  return <>'))+'return {toggleRecording,attachment,recording,preparingVoice,send,setText,setItems,items,remove,setEditing,editing,saveEdit,error,refresh};\n}';
 const Component=vm.runInNewContext(source+';AdminProjectChat',{
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useCallback:fn=>fn,useEffect:fn=>effects.push(fn),
  useProjectChatNotifications:()=>({unreadCount:0,onlineAdmins:[],presenceError:'',markRead:async()=>{}}),
  document:{hidden:false,addEventListener(){},removeEventListener(){}},window:{confirm:()=>confirm,setInterval(){},clearInterval(){}},
  navigator:{mediaDevices:{getUserMedia:async()=>{const track={stopped:false,stop(){this.stopped=true;}};tracks.push(track);return {getTracks:()=>[track]};}}},MediaRecorder:Recorder,FileReader:Reader,Blob,
  fetchEchoProjectChat:async()=>({items:rows}),
  sendEchoProjectChat:async payload=>{sent.push(payload);const item={id:'sent',senderId:'me',...payload};rows=[...rows,item];return {item};},
  deleteEchoProjectChatMessage:async id=>{removed.push(id);if(failDelete)throw Error('Delete failed');rows=rows.filter(item=>item.id!==id);return {deleted:true,id};},
  editEchoProjectChatMessage:async(id,payload)=>{edits.push({id,payload});if(failEdit)throw Error('Changed in another tab');const item={id,senderId:'me',content:payload.content,editedAt:new Date().toISOString()};rows=rows.map(row=>row.id===id?item:row);return {item};},
 });
 const render=()=>{cursor=0;return Component({user:{id:'me'},token:'test-admin',fullPage:false});};
 render();const cleanup=effects[0]();
 return {render,recorders,tracks,sent,removed,edits,cleanup,setRows(items){rows=items;render().setItems(items);},setConfirm(value){confirm=value;},setDeleteFailure(value){failDelete=value;},setEditFailure(value){failEdit=value;}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('a voice note is prepared for playback before any send, with a valid MIME header',async()=>{
 const f=fixture();await f.render().toggleRecording();assert.equal(f.render().recording,true);assert.equal(f.sent.length,0);
 await f.render().send({preventDefault(){}});assert.equal(f.sent.length,0,'Send cannot transmit while recording');
 await f.render().toggleRecording();await f.recorders[0].finished;
 const draft=f.render().attachment;assert.equal(draft.type,'audio');assert.equal(draft.mimeType,'audio/webm');assert.match(draft.data,/^data:audio\/webm;base64,/);assert.equal(f.tracks[0].stopped,true);assert.equal(f.sent.length,0,'creating the preview must not send it');
 await f.render().send({preventDefault(){}});await flush();assert.equal(f.sent.length,1);assert.equal(f.sent[0].attachment.data,draft.data);assert.equal(f.render().attachment,null);f.cleanup();
});
test('leaving the chat stops recording and never creates a late attachment',async()=>{
 const f=fixture();await f.render().toggleRecording();f.cleanup();assert.equal(f.tracks[0].stopped,true);assert.equal(f.recorders[0].state,'inactive');assert.equal(f.sent.length,0);
});
test('delete requires confirmation, preserves failed messages, and removes confirmed text, image or audio',async()=>{
 const f=fixture();const rows=[{id:'text',senderId:'me',content:'text'},{id:'image',senderId:'me',attachment:{type:'image'}},{id:'audio',senderId:'me',attachment:{type:'audio'}},{id:'other',senderId:'other',content:'theirs'}];f.setRows(rows);
 f.setConfirm(false);await f.render().remove(rows[0]);assert.equal(f.removed.length,0);
 f.setConfirm(true);await f.render().remove(rows[3]);assert.equal(f.removed.length,0);
 f.setDeleteFailure(true);await f.render().remove(rows[0]);assert.equal(f.render().items.length,4);assert.equal(f.render().error,'Delete failed');
 f.setDeleteFailure(false);for(const item of rows.slice(0,3)){await f.render().remove(item);await flush();}assert.deepEqual(f.render().items.map(item=>item.id),['other']);f.cleanup();
});
test('editing submits the original version, retains failed drafts, and displays the confirmed edit',async()=>{
 const f=fixture();f.setRows([{id:'text',senderId:'me',content:'Original'}]);f.render().setEditing({id:'text',content:'Updated',original:'Original'});
 f.setEditFailure(true);await f.render().saveEdit({preventDefault(){}});assert.equal(f.render().editing.content,'Updated');assert.equal(f.render().items[0].content,'Original');
 f.setEditFailure(false);await f.render().saveEdit({preventDefault(){}});await flush();assert.deepEqual(JSON.parse(JSON.stringify(f.edits.at(-1).payload)),{content:'Updated',expectedContent:'Original'});assert.equal(f.render().items[0].content,'Updated');assert.equal(f.render().editing,null);f.cleanup();
});

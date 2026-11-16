import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Duplication guard: the server's `request.journey` (booking-journey.js in the backend) is the only description of what a
// booking-request status means. The UI branches on its facts (isBooked, awaitingClient, ...), never on a status literal.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lifecycleOnly=/['"`](quoted|accepted|changes_requested)['"`]/;
const statusCompare=new RegExp([
 "status\\s*(?:===|!==|==|!=)\\s*['\"`](?:confirmed|expired|cancelled|pending)['\"`]",
 "\\[[^\\]]*['\"`](?:confirmed|expired|cancelled)['\"`][^\\]]*\\]\\.includes\\(",
].join('|'));

// lib/studioStop.js uses 'accepted' as a BroadcastChannel message type for the live studio, not a booking status.
const unrelated=new Set(['lib/studioStop.js']);
function sources(dir,out=[]){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())sources(full,out);
  else if(/\.(jsx?|mjs)$/.test(entry.name)&&!/\.test\.(jsx?|mjs)$/.test(entry.name))out.push(full);
 }
 return out;
}

test('no UI file branches on a booking lifecycle status literal',()=>{
 const found=[];
 for(const file of sources(root).filter(file=>!unrelated.has(path.relative(root,file).split(path.sep).join('/'))))fs.readFileSync(file,'utf8').split('\n').forEach((line,index)=>{
  if(lifecycleOnly.test(line)||statusCompare.test(line))found.push(`${path.relative(root,file)}:${index+1}  ${line.trim().slice(0,110)}`);
 });
 assert.deepEqual(found,[],'Read request.journey instead:\n'+found.join('\n'));
});

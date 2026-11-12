import test from 'node:test';
import assert from 'node:assert/strict';
import {moveAtomSegment} from './recordingAtoms.js';
const atom=(id,s,e)=>({id,audioRange:{startSec:s,endSec:e}});
test('moveAtomSegment slides an atom keeping its length, inside its neighbours and the recording',()=>{
 const items=[atom('a',0,10),atom('b',20,30),atom('c',60,70)];
 const at=(list,id)=>list.find(i=>i.id===id).audioRange;
 assert.deepEqual(at(moveAtomSegment(items,'b',35,100),'b'),{startSec:35,endSec:45});
 assert.deepEqual(at(moveAtomSegment(items,'b',55,100),'b'),{startSec:50,endSec:60});
 assert.deepEqual(at(moveAtomSegment(items,'b',-5,100),'b'),{startSec:10,endSec:20});
 assert.equal(moveAtomSegment([atom('a',0,10),atom('b',10,20),atom('c',20,30)],'b',15,100)[1].audioRange.startSec,10);
});

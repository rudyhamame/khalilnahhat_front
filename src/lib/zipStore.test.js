import test from 'node:test';
import assert from 'node:assert/strict';
import {zipStore} from './zipStore.js';
test('zipStore writes a valid STORE archive',async()=>{
 const blob=zipStore([{name:'a.txt',data:new TextEncoder().encode('hello')},{name:'b.txt',data:new TextEncoder().encode('world!')}]);
 const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);
 const end=bytes.length-22;assert.equal(view.getUint32(end,true),0x06054b50);assert.equal(view.getUint16(end+10,true),2);
 const central=view.getUint32(end+16,true);assert.equal(view.getUint32(central,true),0x02014b50);
 assert.equal(new TextDecoder().decode(bytes.slice(30+5,30+5+5)),'hello');
});

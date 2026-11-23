import {test} from 'node:test';
import assert from 'node:assert/strict';
import {musicBoxScrollTarget} from './musicBoxPosition.js';
test('mobile music player centers below the header regardless of the story text above it',()=>{
 const target=musicBoxScrollTarget({box:{top:500,height:620},scrollY:1000,viewportHeight:844,headerBottom:64});
 assert.equal(target,1356);assert.equal(500+620/2-(target-1000),(844+64)/2);
});
test('centering follows the visible viewport as mobile browser chrome changes',()=>{
 assert.equal(musicBoxScrollTarget({box:{top:250,height:500},scrollY:800,viewportTop:20,viewportHeight:700,headerBottom:80}),900);
 assert.equal(musicBoxScrollTarget({box:{top:250,height:500},scrollY:800,viewportHeight:600,headerBottom:64}),968);
 assert.equal(musicBoxScrollTarget({box:{top:100,height:400},scrollY:0,viewportHeight:900}),0);
});

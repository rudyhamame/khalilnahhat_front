import test from 'node:test';import assert from 'node:assert/strict';
import {loadScreenSettings,saveScreenSettings} from './liveScreens.js';
const memory=()=>{const map=new Map();return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value))};};
test('countdown settings come back for the next live; missing or invalid values fall back to the defaults',()=>{
  const storage=memory();
  assert.deepEqual(loadScreenSettings(storage),{pauseCountdown:3,pauseIntro:0,goCountdown:3});
  saveScreenSettings({pauseCountdown:10,pauseIntro:30,goCountdown:60},storage);
  assert.deepEqual(loadScreenSettings(storage),{pauseCountdown:10,pauseIntro:30,goCountdown:60});
  storage.setItem('echo-live-screens',JSON.stringify({pauseCountdown:7,pauseIntro:'x',goCountdown:5}));
  assert.deepEqual(loadScreenSettings(storage),{pauseCountdown:3,pauseIntro:0,goCountdown:5});
  storage.setItem('echo-live-screens','not json');assert.deepEqual(loadScreenSettings(storage),{pauseCountdown:3,pauseIntro:0,goCountdown:3});
});

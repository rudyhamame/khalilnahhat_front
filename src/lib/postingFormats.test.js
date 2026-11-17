import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {POSTING_PLATFORMS,POSTING_VIDEO_GOALS,customPostingGoal} from './postingFormats.js';
const back=new URL('../../../khalil-back/',import.meta.url);
test('all platform video presets have matching server render ratios',()=>{
 if(!existsSync(back))return;
 const {postingGoalRatio}=createRequire(import.meta.url)(new URL('src/posting-formats.js',back).pathname);
 assert.equal(readFileSync(new URL('contracts/posting-formats.json',back),'utf8'),readFileSync(new URL('./contracts/posting-formats.json',import.meta.url),'utf8'));
 assert.ok(POSTING_VIDEO_GOALS.length>30);
 assert.deepEqual(POSTING_PLATFORMS.echo.types.find(type=>type.id==='reel').ratios,['9:16']);
 for(const [id,,ratio] of POSTING_VIDEO_GOALS)assert.equal(postingGoalRatio(id),ratio,id);
 for(const type of POSTING_PLATFORMS.youtube.types.filter(type=>type.id==='short'))assert.ok(type.ratios.every(r=>!['16:9','1.91:1'].includes(r)));
 for(const [w,h] of [[1080,1350],[1440,1080],[1080,1080]]){const goal=customPostingGoal(w,h);assert.equal(postingGoalRatio(goal[0]),goal[2]);}
 for(const id of ['__proto__','constructor','custom-1x0','custom-9999x1080','custom-320x3840'])assert.equal(postingGoalRatio(id),null);
});

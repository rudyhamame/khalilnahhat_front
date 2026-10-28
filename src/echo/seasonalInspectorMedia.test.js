import {test} from 'node:test';
import assert from 'node:assert/strict';
import {treeVideoSource} from './seasonalInspectorMedia.js';
test('tree video players accept direct clips and normalize supported hosted videos without autoplay',()=>{
 const id='k5OM4GUJNvQ';
 for(const url of [`https://www.youtube.com/watch?v=${id}`,`https://youtu.be/${id}`,`https://www.youtube.com/shorts/${id}`,`https://www.youtube.com/live/${id}`])assert.deepEqual(treeVideoSource(url),{kind:'embed',src:`https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`});
 assert.deepEqual(treeVideoSource('https://vimeo.com/123456'),{kind:'embed',src:'https://player.vimeo.com/video/123456?dnt=1'});
 assert.deepEqual(treeVideoSource('/echo/clip.mp4'),{kind:'video',src:'/echo/clip.mp4'});
 for(const value of ['javascript:alert(1)','data:text/html,<script></script>','https://youtube.com/watch?v=bad','https://vimeo.com/nonnumeric'])assert.equal(treeVideoSource(value),null);
});

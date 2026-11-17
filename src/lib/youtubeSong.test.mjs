import test from 'node:test';
import assert from 'node:assert/strict';
import {songFromVideo} from './youtubeSong.mjs';
test('a YouTube result becomes a song entry with artist and link, no typing needed',()=>{
 assert.deepEqual(songFromVideo({title:'Fairuz - Habibi (Official Video)',channelTitle:'Fairuz VEVO',url:'https://www.youtube.com/watch?v=x'}),{song:'Habibi',artist:'Fairuz',link:'https://www.youtube.com/watch?v=x'});
 assert.deepEqual(songFromVideo({title:'Perfect &amp; Lovely',channelTitle:'Ed Sheeran - Topic',url:'https://www.youtube.com/watch?v=y'}),{song:'Perfect & Lovely',artist:'Ed Sheeran',link:'https://www.youtube.com/watch?v=y'});
});

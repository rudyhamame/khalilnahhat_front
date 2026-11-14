import {test} from 'node:test';import assert from 'node:assert/strict';
import {audioConversionPending,rawAudioDownloadUrl,AUDIO_CONVERSION_STALE_MS} from './rawSetListAudio.js';
test('raw Cloudinary audio downloads use attachment delivery without audio effects',()=>{
 const url=rawAudioDownloadUrl({track:'My Song / العربية',audioUrl:'https://res.cloudinary.com/test/video/upload/v123/music/song.wav'});
 assert.match(url,/\/upload\/fl_attachment:My-Song-\/v123\/music\/song.wav$/);assert.doesNotMatch(url,/normalize|volume|quality|effect|bit_rate/);
});
test('audio links reject non-web schemes and preserve independent audio providers',()=>{
 assert.equal(rawAudioDownloadUrl({audioUrl:'javascript:alert(1)'}),'');assert.equal(rawAudioDownloadUrl({audioUrl:'https://example.com/raw.wav'}),'https://example.com/raw.wav');assert.equal(rawAudioDownloadUrl({}),'');
});
test('converting status survives refresh but interrupted jobs become retryable',()=>{
 const now=Date.now();assert.equal(audioConversionPending({audioPreparation:'converting',audioConversionStartedAt:new Date(now)},now),true);
 assert.equal(audioConversionPending({audioPreparation:'converting',audioConversionStartedAt:new Date(now-AUDIO_CONVERSION_STALE_MS-1)},now),false);
 assert.equal(audioConversionPending({audioPreparation:'failed'},now),false);
});

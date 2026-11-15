import test from 'node:test';
import assert from 'node:assert/strict';
import {favouriteSongEntries,isYouTubeLink,validFavouriteSongs} from './favouriteSongs.mjs';
import {createEventOrder,normalizeEventOrder,updateOrderField,bookingDraftSummary} from './eventOrderCore.mjs';

test('favourite songs retain song, artist and optional YouTube link through draft updates',()=>{
 const songs=[{song:'My song',artist:'My artist',link:'https://youtu.be/example'},{song:'Another song',artist:'Another artist'}];
 const order=updateOrderField(createEventOrder(),'music.favouriteSongs',songs);
 assert.deepEqual(normalizeEventOrder(order).music.favouriteSongs,songs);
 assert.match(bookingDraftSummary(order),/My song — My artist/);
 assert.match(bookingDraftSummary(order),/https:\/\/youtu.be\/example/);
});
test('new favourite entries require both names and only accept YouTube links',()=>{
 assert.equal(validFavouriteSongs([{song:'Song',artist:''}]),false);
 assert.equal(validFavouriteSongs([{song:'',artist:'Artist'}]),false);
 for(const link of ['javascript:alert(1)','https://youtube.com.example.com/watch','https://example.com/watch','https://user:pass@youtube.com/watch','http://youtube.com/watch'])assert.equal(validFavouriteSongs([{song:'Song',artist:'Artist',link}]),false,link);
 assert.equal(isYouTubeLink('https://music.youtube.com/watch?v=example'),true);
 assert.equal(isYouTubeLink('https://www.youtube.com/shorts/example'),true);
 assert.equal(validFavouriteSongs([{song:'Song',artist:'Artist'}]),true);
});
test('existing song-only entries survive normalization and mixed lists',()=>{
 const songs=['Saved before this change',{song:'New song',artist:'New artist'}];
 assert.equal(validFavouriteSongs(songs),true);
 assert.deepEqual(normalizeEventOrder({...createEventOrder(),music:{favouriteSongs:songs}}).music.favouriteSongs,songs);
 assert.deepEqual(favouriteSongEntries(songs),[{song:'Saved before this change',artist:'',link:''},{song:'New song',artist:'New artist',link:''}]);
});

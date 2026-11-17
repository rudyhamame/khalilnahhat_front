import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createEventOrder} from '../lib/eventOrderCore.mjs';
import {sectionLines} from '../lib/bookingReviewModel.js';
import {bookingGoal} from '../lib/bookingGoals.js';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:MusicPreferenceValue}=await server.ssrLoadModule('/src/echo/MusicPreferenceValue.jsx');
const {default:EchoChatMessage}=await server.ssrLoadModule('/src/echo/EchoChatMessage.jsx');
const {AtomRow}=await server.ssrLoadModule('/src/echo/bookingReview.jsx');
const songs=[{song:'Ahla Marra',artist:'Melhem Zein',phase:'Grand entrance',link:'https://www.youtube.com/watch?v=first'},{song:'Perfect',artist:'Ed Sheeran',phase:'First dance',link:'https://youtu.be/second'}];
const render=(Component,props)=>renderToStaticMarkup(createElement(Component,props));
test('review and map atoms preserve full songs, individual artists, moments and safe links',()=>{
 const order=createEventOrder();order.music.suggestedSongs=songs;
 const line=sectionLines(order,bookingGoal('music'),false).lines.find(line=>line.key==='music.suggestedSongs');
 assert.deepEqual(line.rawValue,songs);
 const html=render(AtomRow,{line,tr:(en)=>en});
 assert.equal((html.match(/class="music-song"/g)||[]).length,2);
 for(const value of ['Ahla Marra','Melhem Zein','Grand entrance','Perfect','Ed Sheeran','First dance'])assert.ok(html.includes(value));
 assert.match(html,/href="https:\/\/youtu.be\/second"/);
 assert.doesNotMatch(html,/\(https:|<button/);
});
test('conversation renders explicit music sections and saved assistant music records',()=>{
 const content='Suggested songs: Grand entrance: Ahla Marra – Melhem Zein https://www.youtube.com/watch?v=first ; First dance: Perfect — Ed Sheeran https://youtu.be/second';
 for(const message of [{role:'user',content},{role:'assistant',content:'Your music preferences are saved.',musicFields:[{path:'music.suggestedSongs',value:songs}]}]){
  const html=render(EchoChatMessage,{message});
  assert.equal((html.match(/class="music-song"/g)||[]).length,2);
  assert.match(html,/class="music-song-artist"/);assert.match(html,/href=/);
 }
});
test('music fields render separate language pairs, list entries and preserved notes; unsafe links never render',()=>{
 const pairs=render(MusicPreferenceValue,{path:'music.languagePairs',value:[{language:'Arabic',dialect:'Lebanese'},{language:'English',dialect:''}]});
 assert.equal((pairs.match(/class="music-language"/g)||[]).length,2);
 const artists=render(MusicPreferenceValue,{path:'music.favouriteArtists',value:['Fairuz','Najwa Karam']});
 assert.equal((artists.match(/role="listitem"/g)||[]).length,2);
 const html=render(MusicPreferenceValue,{path:'music.suggestedSongs',value:[{song:'Song',link:'javascript:alert(1)'}]});
 assert.doesNotMatch(html,/href=|javascript/);
});
test('uploaded inspiration photos have stable visible numbers in review and concept-map atoms',()=>{
 const order=createEventOrder();order.references.photos=[{url:'https://res.cloudinary.com/demo/image/upload/one.jpg',name:'Entrance.jpg',comment:''},{url:'https://res.cloudinary.com/demo/image/upload/two.jpg',name:'Cake.png',comment:''}];
 const line=sectionLines(order,bookingGoal('references'),false).lines.find(row=>row.key==='references.photos');
 const html=render(AtomRow,{line,tr:en=>en});
 assert.match(html,/reference-number[^>]*>1\.<\/b>/);assert.match(html,/reference-number[^>]*>2\.<\/b>/);
 assert.ok(html.indexOf('1.</b>')<html.indexOf('Entrance.jpg'));assert.ok(html.indexOf('2.</b>')<html.indexOf('Cake.png'));
});
test('uploaded event documents have stable visible numbers in review and concept-map atoms',()=>{
 const order=createEventOrder();order.references.files=[{url:'https://res.cloudinary.com/demo/raw/upload/timeline.pdf',name:'Timeline.pdf',comment:''},{url:'https://res.cloudinary.com/demo/raw/upload/menu.docx',name:'Menu.docx',comment:''}];
 const line=sectionLines(order,bookingGoal('references'),false).lines.find(row=>row.key==='references.files');
 const html=render(AtomRow,{line,tr:en=>en});
 assert.match(html,/reference-number[^>]*>1\.<\/b>/);assert.match(html,/reference-number[^>]*>2\.<\/b>/);
 assert.ok(html.indexOf('1.</b>')<html.indexOf('Timeline.pdf'));assert.ok(html.indexOf('2.</b>')<html.indexOf('Menu.docx'));
});

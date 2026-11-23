import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventOrder,missingOrderFields} from './eventOrderCore.mjs';
import {bookingGoal,goalProgress,goalNextStep} from './bookingGoals.js';
import {sectionLines,submittedSectionLines} from './bookingReviewModel.js';
import {unconfirmedReviewAtoms} from './bookingAtomReview.js';
import {reconcileSuggestedSongRows,savedSuggestedSongs} from './suggestedSongRows.js';

const rentals=[{id:'sound',name:'Sound',bookingServiceId:'sound',equipment:[{id:'speaker',name:'Speaker'}]}];
test('rental decision stays visible, decline gates browsing and preserves saved selections for correction',()=>{
 const order=createEventOrder();order.rental.requested=false;
 const goal=bookingGoal('rentals');
 let lines=sectionLines(order,goal,false,rentals).lines;
 assert.equal(lines.find(row=>row.key==='rental.requested').value,'No');
 assert.equal(lines.some(row=>row.category),false);
 order.equipment=[{id:'speaker',name:'Speaker',quantity:2}];
 lines=sectionLines(order,goal,false,rentals).lines;
 assert.match(lines.find(row=>row.key==='rental.requested').value,/still saved/);
 assert.equal(lines.find(row=>row.category).items[0].reviewValue,2);
 const reviewable=unconfirmedReviewAtoms({},lines.flatMap(row=>[row,...row.items||[]]));
 assert.deepEqual(reviewable.map(row=>row.key),['rental.requested','equipment:sound:speaker']);
});
test('saved equipment missing from the current catalogue remains visible, also in submitted snapshots',()=>{
 const order=createEventOrder();order.equipment=[{id:'retired',name:'Saved speaker',quantity:3}];
 const goal=bookingGoal('rentals');
 const live=sectionLines(order,goal,false,rentals).lines.flatMap(row=>row.items||[]).find(row=>row.key.endsWith(':retired'));
 assert.equal(live.label,'Saved speaker');assert.equal(live.reviewValue,3);assert.match(live.stock,/remove or replace/);
 assert.match(submittedSectionLines(order,goal).lines.find(row=>row.key==='equipment').value,/Saved speaker × 3/);
});
test('optional DJ and MC questions never inflate the required fields or goal missing count',()=>{
 const order=createEventOrder();
 assert.equal(missingOrderFields(order).some(row=>row.key.startsWith('music.')),false);
 assert.deepEqual(goalProgress(order,bookingGoal('music')).missing,[]);
 assert.equal(goalNextStep(order,false,'music').path,'music.djRequested');
});
test('external song additions, corrections and removals replace stale saved rows without dropping incomplete typing',()=>{
 const a={song:'Song A',artist:'Artist A',phase:'Intro'},b={song:'Song B',artist:'Artist B',phase:''};
 const draft={key:'draft',song:'Half typed',artist:'',phase:'',mode:'manual',done:false};
 const rows=reconcileSuggestedSongRows([{...a,key:'a'},draft],[a],[a,b]);
 assert.deepEqual(savedSuggestedSongs(rows),[a,b]);assert.equal(rows.at(-1),draft);
 const edited=rows.map(row=>row.key==='a'?{...row,phase:'Dinner'}:row);
 assert.deepEqual(savedSuggestedSongs(edited),[{...a,phase:'Dinner'},b]);
 const removed=reconcileSuggestedSongRows(rows,[a,b],[b]);
 assert.deepEqual(savedSuggestedSongs(removed),[b]);assert.equal(removed.at(-1),draft);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEventOrder,referenceLinkRequest,claimsDraftChange} from './eventOrderCore.mjs';
import {prepareBookingDraftEdit} from './bookingDraftEdits.js';
import {sectionLines} from './bookingReviewModel.js';
import {bookingGoal} from './bookingGoals.js';
import {accountEventDraft} from './accountEventDraft.js';
const url='https://ca.pinterest.com/pin/585327282866256601/';
test('link intent does not manufacture values; links embedded in text are appended without losing earlier links',()=>{
 const order=createEventOrder();order.references.images=['https://www.pinterest.com/pin/old/'];
 assert.deepEqual(referenceLinkRequest(order,'I want to add a link'),{kind:'ask',links:[]});
 const result=referenceLinkRequest(order,`Please add these reference links: ${url}, https://www.pinterest.com/pin/second/.`);
 assert.deepEqual(result.patch[0],{path:'references.images',value:[...order.references.images,url,'https://www.pinterest.com/pin/second/']});
 assert.equal(referenceLinkRequest(order,'https://youtube.com/watch?v=example').kind,'clarify');
 assert.equal(referenceLinkRequest(order,'Suggested songs: First dance: Perfect — Ed Sheeran https://youtu.be/example'),null);
 assert.equal(referenceLinkRequest(order,'https://youtu.be/example',{context:'music.suggestedSongs'}),null);
 assert.equal(referenceLinkRequest(order,'http://pinterest.com/pin/example').kind,'unsafe');
 assert.equal(referenceLinkRequest(order,'https://password@pinterest.com/pin/example').kind,'unsafe');
});
test('exact reported Pinterest link survives saving, reloading and the Inspiration photo links review atom',async()=>{
 const order=createEventOrder(),action=referenceLinkRequest(order,url);
 const edit=prepareBookingDraftEdit(order,action.patch,{source:'ai'});
 assert.equal(edit.draftUpdated,true);assert.deepEqual(edit.rejectedFields,[]);
 let saved=null;
 const request=async(path,options)=>{if(!options)return {item:saved};saved={version:(saved?.version||0)+1,draftId:'test',order:structuredClone(options.body.order)};return {item:saved};};
 const cloud=accountEventDraft(request);await cloud.load();assert.equal(await cloud.save(edit.order,'test'),true);
 const resumed=(await accountEventDraft(request).load()).order;
 const line=sectionLines(resumed,bookingGoal('references'),false).lines.find(line=>line.key==='references.images');
 assert.equal(line.empty,false);assert.match(line.value,/585327282866256601/);
 assert.deepEqual(referenceLinkRequest(resumed,url).patch,[]);
});
test('passive and active success claims require saved data; explicit failures are not treated as success',()=>{
 for(const text of ['Your draft is updated.','Your reference link has been successfully added.',"I've added that link.",'تمت إضافة الرابط'])assert.equal(claimsDraftChange(text),true,text);
 for(const text of ['Nothing was changed.','No links were added.','The link has not been added.','Please paste your link.','لم يتم حفظ الرابط'])assert.equal(claimsDraftChange(text),false,text);
});

test('repeating unchanged draft fields cannot produce an updated receipt',()=>{
 const order=createEventOrder();order.additional.notes='Keep this note';
 const result=prepareBookingDraftEdit(order,[{path:'additional.notes',value:'Keep this note'}],{source:'ai'});
 assert.equal(result.draftUpdated,false);assert.deepEqual(result.updatedFields,[]);assert.deepEqual(result.rejectedFields,[]);
});

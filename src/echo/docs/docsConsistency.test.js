import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {liveStreamGuide,operationsGuideRoute} from './liveStreamGuide.js';
import {catalogBookingGuide,catalogBookingGuideRoute} from './catalogBookingGuide.js';
import {echoBrainGuide,echoBrainGuideRoute} from './echoBrainGuide.js';
import {bookingDataAtomsGuide,bookingDataAtomsGuideRoute} from './bookingDataAtomsGuide.js';
import {eventAtomAuditGuide,eventAtomAuditGuideRoute} from './eventAtomAuditGuide.js';
import {servicesAuditGuide,servicesAuditGuideRoute} from './servicesAuditGuide.js';
import {liveStudioAuditGuide,liveStudioAuditGuideRoute} from './liveStudioAuditGuide.js';

const guides=[['liveStreamGuide',liveStreamGuide,operationsGuideRoute],['catalogBookingGuide',catalogBookingGuide,catalogBookingGuideRoute],['echoBrainGuide',echoBrainGuide,echoBrainGuideRoute],['bookingDataAtomsGuide',bookingDataAtomsGuide,bookingDataAtomsGuideRoute],['eventAtomAuditGuide',eventAtomAuditGuide,eventAtomAuditGuideRoute],['servicesAuditGuide',servicesAuditGuide,servicesAuditGuideRoute],['liveStudioAuditGuide',liveStudioAuditGuide,liveStudioAuditGuideRoute]];
test('every admin guide is listed on the guide page, has a unique id, a valid review date and the route of its own id',()=>{
 const page=readFileSync(new URL('../ServiceOperationsGuide.jsx',import.meta.url),'utf8');
 assert.equal(new Set(guides.map(([,guide])=>guide.id)).size,guides.length);
 for(const [name,guide,route] of guides){
  assert.match(guide.reviewedOn,/^\d{4}-\d{2}-\d{2}$/,guide.id);
  assert.ok(guide.sections.length>0,guide.id);
  if(guide.id!=='live-stream')assert.ok(route.endsWith(`guide=${guide.id}`),`${guide.id} route`);
  assert.ok(page.includes(`${name},`)||page.includes(`${name}]`),`${guide.id} is in the list of guides`);
 }
});
test('no guide mentions an atom, option or label that has been retired',()=>{
 const retired=['music.styles','music.otherLanguage','music.dialects','music.otherPreferences','music.entrance','music.customMix','music.announcements','references.documents','additional.specialRequests','additional.photos','additional.files','WhatsApp only','Event document links','Special requests section'];
 for(const [,guide] of guides){const text=JSON.stringify(guide);for(const phrase of retired)assert.equal(text.includes(phrase),false,`${guide.id}: ${phrase}`);}
});

import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {default:Admin}=await server.ssrLoadModule('/src/components/AdminServicesPanel.jsx');
test('booking status and availability stay inside the booking reading surface alongside the conversation',()=>{
 const path=['requested','available','quote_ready','booked'].map(status=>({status,label:status==='available'?'Booking date available':status}));
 for(const ar of [false,true]){
  const request={id:'one',status:'pending',customerName:'Client',customerEmail:'client@example.com',items:[],event:{},journey:{repriceable:true,clientStatus:'available',path},availability:{status:'available'}};
  const html=renderToStaticMarkup(createElement(Admin,{requests:[request],ar}));
  assert.match(html,/class="admin-booking-detail-body"><article /);
  const article=html.slice(html.indexOf('<article class="admin-service-request-card'),html.indexOf('</article>'));
  assert.match(article,/class="booking-status-band"/);assert.match(article,/class="booking-availability-step"/);
  assert.ok(article.indexOf('booking-summary')<article.indexOf('booking-status-band'));
  assert.match(article,/aria-current="step"/);assert.match(html,/<\/article><aside class="booking-conversation-aside"/);
 }
});

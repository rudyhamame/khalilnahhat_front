import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});after(()=>server.close());
const {default:Dashboard}=await server.ssrLoadModule('/src/components/DashboardPage.jsx');
const {default:renderRoute}=await server.ssrLoadModule('/src/echo/routes.jsx');
const user={firstName:'Test'};
const render=(activeView,serviceRequests=[])=>renderToStaticMarkup(createElement(Dashboard,{user,activeView,serviceRequests}));
test('/services renders the rentals section directly instead of a blank redirect frame',()=>{
 const route=renderRoute('/services',{lang:{lang:'en'}});assert.equal(route.props.children.props.section,'setup');
});
test('legacy dashboard planning and payments views render useful empty states',()=>{
 assert.match(render('planning'),/Planning opens after confirmation/);
 assert.match(render('payments'),/No payments to arrange yet/);
 assert.match(render('services'),/No service requests yet/);
});
test('dashboard handles saved requests without a journey object and exposes confirmed planning',()=>{
 const request={id:'one',status:'confirmed',requestNumber:'TEST-001',createdAt:'2026-11-17T12:00:00Z',event:{eventDate:'2027-06-19'},items:[],payments:[]};
 assert.match(render('overview',[request]),/TEST-001/);
 assert.match(render('planning',[request]),/SAVE PLANNING DETAILS/);
 assert.match(render('services',[request]),/Booking confirmed/);
});

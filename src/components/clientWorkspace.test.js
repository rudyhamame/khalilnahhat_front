import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { clientWorkspaceView } from '../lib/clientWorkspaceRoutes.js';

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => server.close());
const { default: Dashboard } = await server.ssrLoadModule('/src/components/DashboardPage.jsx');
const { default: AdminWorkspace } = await server.ssrLoadModule('/src/components/AdminWorkspace.jsx');
const user = { firstName: 'Test', username: 'client-test' };
const render = (activeView, serviceRequests = []) => renderToStaticMarkup(createElement(Dashboard, { user, activeView, serviceRequests }));

test('client overview shares the workspace shell but exposes no admin tools', () => {
  const html = render('overview');
  assert.match(html, /Client Workspace/);
  assert.match(html, /Welcome, Test/);
  for (const href of ['/dashboard/draft', '/dashboard/bookings', '/dashboard/conversations']) assert.ok(html.includes(`href="${href}"`));
  assert.doesNotMatch(html, /href="\/admin/);
  assert.doesNotMatch(html, /AI Search|Reserve a working slot/);
});

test('each empty client page stays inside the new workspace', () => {
  for (const [view, text] of [['services', 'No service requests yet'], ['planning', 'Planning opens after confirmation.'], ['payments', 'No payments to arrange yet.']]) {
    const html = render(view);
    assert.match(html, /client-workspace/);
    assert.ok(html.includes(text));
  }
});
test('booking views are standalone pages with their own active sidebar link', () => {
  for(const [view,href,title] of [
    ['draft','/dashboard/draft','booking-draft-title'],
    ['bookings','/dashboard/bookings','requested-services-title'],
    ['conversations','/dashboard/conversations','conversation-history-title'],
  ]) {
    const html=render(view);
    assert.match(html,new RegExp(`href="${href}"[^>]*aria-current="page"`));
    assert.ok(html.includes(`id="${title}"`));
    assert.doesNotMatch(html,/cw-booking-tabs|aria-label="Booking views"/);
    for(const other of ['booking-draft-title','requested-services-title','conversation-history-title'].filter(id=>id!==title))assert.ok(!html.includes(`id="${other}"`));
  }
});

test('workspace URLs and legacy booking links resolve to the correct view', () => {
  for(const [path,search,view] of [
    ['/dashboard','','overview'],
    ['/dashboard/draft','','draft'],
    ['/dashboard/bookings','','bookings'],
    ['/dashboard/conversations','','conversations'],
    ['/dashboard/services','','bookings'],
    ['/dashboard/bookings','?tab=quotes','bookings'],
    ['/dashboard/bookings','?tab=draft','draft'],
    ['/dashboard/bookings','?tab=conversations','conversations'],
    ['/dashboard/profile','','profile'],
  ])assert.equal(clientWorkspaceView(path,search),view);
});

const request = { id: 'test-request', requestNumber: 'TEST-001', status: 'confirmed', createdAt: '2026-10-26T12:00:00Z', items: [], event: { eventDate: '2027-06-20' }, depositPaidCents: 10000, total: 500, payments: [] };
test('confirmed events expose saved planning and recorded payment interfaces', () => {
  const planning = render('planning', [request]);
  assert.match(planning, /TEST-001/);
  assert.match(planning, /SAVE PLANNING DETAILS/);
  assert.match(planning, /Must-play songs/);
  assert.match(render('payments', [request]), /Remaining balance/);
  assert.doesNotMatch(render('planning', [{ ...request, status: 'pending' }]), /SAVE PLANNING DETAILS/);
});

test('admin defaults and navigation remain unchanged', () => {
  const html = renderToStaticMarkup(createElement(AdminWorkspace, { username: 'admin' }, 'Admin content'));
  assert.match(html, /Admin workspace/);
  assert.match(html, /href="\/admin\/live-stream"/);
  assert.match(html, /Booking requests/);
  assert.doesNotMatch(html, /Client Workspace/);
});

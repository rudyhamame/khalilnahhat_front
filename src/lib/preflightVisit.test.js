import {test} from 'node:test';
import assert from 'node:assert/strict';

const key = 'echo-preflight-complete';
function storage(values = new Map()) {
  return {getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value)};
}
let serial = 0;
const freshVisit = () => import(`./preflightVisit.js?visit=${++serial}`);

test('new browsers show preflight; completion persists across tabs and browser restarts', async () => {
  const localStorage = storage();
  const first = await freshVisit();
  const browser = {localStorage, sessionStorage: storage()};
  assert.equal(first.hasCompletedPreflight(browser), false);
  first.rememberPreflightCompletion(browser);
  const restarted = await freshVisit();
  assert.equal(restarted.hasCompletedPreflight({localStorage, sessionStorage: storage()}), true);
});

test('existing completed tabs migrate to persistent browser storage', async () => {
  const visit = await freshVisit();
  const browser = {localStorage: storage(), sessionStorage: storage(new Map([[key, 'true']]))};
  assert.equal(visit.hasCompletedPreflight(browser), true);
  assert.equal(browser.localStorage.getItem(key), 'true');
});

test('storage restrictions retain completion for the loaded app', async () => {
  const visit = await freshVisit();
  const browser = {get localStorage() {throw new Error('blocked');}, get sessionStorage() {throw new Error('blocked');}};
  assert.equal(visit.hasCompletedPreflight(browser), false);
  visit.rememberPreflightCompletion(browser);
  assert.equal(visit.hasCompletedPreflight(browser), true);
});

test('clearing browser data allows preflight on a subsequent visit', async () => {
  const visit = await freshVisit();
  assert.equal(visit.hasCompletedPreflight({localStorage: storage(), sessionStorage: storage()}), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {formatTime} from './formatTime.js';
test('ISO timestamps become local date and time, plain dates become local dates, other text is untouched',()=>{
 assert.match(formatTime('2026-11-13T05:20:37.167Z','en-US'),/^Nov 1[23], 2026, \d{1,2}:\d{2}\s?[AP]M$/);
 assert.equal(formatTime('2026-11-13','en-US'),'Nov 13, 2026');
 assert.equal(formatTime('Not a date','en-US'),'Not a date');
 assert.equal(formatTime(undefined),'');
});

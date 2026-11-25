import test from 'node:test';import assert from 'node:assert/strict';
import contractAtoms from './contracts/booking-atoms.json' with {type:'json'};
import {BOOKING_GOALS} from './bookingGoals.js';
import {sectionLines,submittedSectionLines} from './bookingReviewModel.js';
import {createEventOrder} from './eventOrderCore.mjs';
import {ATOM_KEYS} from './eventPageModel.js';

// The Booking page review, the client and admin dashboards (and the Android apps, which read the same contract) list the SAME data atoms in the SAME order, each once.
const contractKeys=contractAtoms.sections.flatMap(([,keys])=>keys);
test('every surface lists the contract atoms once, in contract order',()=>{
 assert.deepEqual(ATOM_KEYS,contractKeys);
 const order=createEventOrder();order.music.djRequested=true;order.music.mcRequested=true;order.rental={...order.rental,requested:true};order.event.type='other';
 const page=BOOKING_GOALS.flatMap(goal=>sectionLines(order,goal,false).lines.map(line=>line.key));
 const dashboards=BOOKING_GOALS.flatMap(goal=>submittedSectionLines(createEventOrder(),goal,false).lines.map(line=>line.key));
 assert.deepEqual(page,contractKeys,'Booking page review');
 assert.deepEqual(dashboards,contractKeys,'client and admin dashboards (every atom, answered or not)');
});

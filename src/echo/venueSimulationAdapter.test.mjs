import {test} from 'node:test';import assert from 'node:assert/strict';import {simulationFromRecord,boundaryArea} from './venueSimulationAdapter.mjs';
const record={_id:'saved',report:{simulation:{level:'verified',widthM:20,depthM:12,boundary:[[-10,-6],[10,-6],[10,6],[-10,6]]}}};
test('simulation preserves source geometry and axes with metre scaling',()=>{const simulation=simulationFromRecord(record);assert.equal(simulation.widthM,20);assert.equal(simulation.depthM,12);assert.deepEqual(simulation.boundary,record.report.simulation.boundary);});
test('saved user-confirmed measurements take precedence over refreshed research',()=>{const simulation=simulationFromRecord({...record,manual:{widthM:18,depthM:11,verifiedByUser:true}});assert.equal(simulation.widthM,18);assert.equal(simulation.depthM,11);assert.equal(simulation.level,'manual');});
test('unknown indoor data requires an explicitly fictional concept with no fabricated dimensions',()=>{const unknown={_id:'unknown',report:{simulation:{level:'conceptual',boundary:null}}};assert.throws(()=>simulationFromRecord(unknown),/unknown/);const concept=simulationFromRecord(unknown,{conceptual:true});assert.equal(concept.boundary,null);assert.equal(concept.widthM,undefined);assert.match(concept.label,/Fictional/);});
test('exterior tracing cannot enter indoor simulation; explicit indoor manual polygons preserve shape',()=>{const polygon=[[-5,-5],[5,-5],[5,0],[0,5],[-5,5]];assert.throws(()=>simulationFromRecord({_id:'building',manual:{geometryScope:'building_footprint',geometry:{coordinates:[polygon]}},report:{simulation:{level:'conceptual'}}}),/unknown/);const simulation=simulationFromRecord({...record,manual:{simulation:{boundary:polygon,widthM:10,depthM:10,level:'manual'}}});assert.deepEqual(simulation.boundary,polygon);});

test('nonrectangular floor area preserves a cutout rather than reporting its bounding-box area',()=>{assert.equal(boundaryArea([[-5,-5],[5,-5],[5,0],[0,0],[0,5],[-5,5]]),75);assert.equal(boundaryArea([[-5,-5],[5,-5],[5,5],[-5,5]],[[[-1,-1],[1,-1],[1,1],[-1,1]]]),96);});

test('explicit fictional concept overrides saved geometry without changing saved manual measurements',()=>{
 const saved={...record,manual:{widthM:18,depthM:11,simulation:{level:'manual',widthM:18,depthM:11,boundary:[[-9,-5.5],[9,-5.5],[9,5.5],[-9,5.5]]}}};
 const original=structuredClone(saved);const concept=simulationFromRecord(saved,{conceptual:true});
 assert.equal(concept.level,'conceptual');assert.equal(concept.boundary,null);assert.equal(concept.widthM,undefined);assert.deepEqual(saved,original);
});

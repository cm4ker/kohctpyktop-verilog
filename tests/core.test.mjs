import test from 'node:test';
import assert from 'node:assert/strict';
import {Canvas} from '../game/canvas.js';
import {Editor} from '../game/editor.js';
import {Simulation,expand,matches} from '../game/simulation.js';
import {levels} from '../game/levels.js';
import {encode,decode,exportLegacy,importLegacy} from '../game/storage.js';
import {blank,line,quadInverter} from './fixtures.mjs';
import {deflateSync} from 'node:zlib';

test('all 19 original levels: pin counts, timing, and empty-circuit failure',()=>{
  assert.equal(levels.length,19);for(const l of levels){assert.equal(l.pins.length,8);assert(l.pins.some(p=>p.output));for(const p of l.pins)assert.equal(expand(p.blocks,p.output).length,l.length);const s=new Simulation(blank(),l);assert(s.run()<97,l.id);assert.equal(s.time,l.length);}
});
test('original pulse, spike and grading transition tolerance',()=>{
  assert.deepEqual(expand([2]),[true,true,true,true,true,false,false,false,false,false]);
  assert.deepEqual(expand([3],true),[false,false,true,true,true,true,true,false,false,false]);
  const pattern=expand([0,1,0]);const v=[...pattern];v[10]=false;v[11]=false;assert.equal(matches(v,pattern),100);v[14]=false;assert(matches(v,pattern)<100);
});
test('drawing keeps parallel adjacent tracks separate; pads are protected',()=>{
  const c=blank(),e=new Editor(c);line(e,1,false,[[4,5],[10,5]]);line(e,1,false,[[4,6],[10,6]]);c.SimSetHot(4,5,true);assert(c.metalHot[10][5]);assert(!c.metalHot[10][6]);line(e,4,true,[[2,3]]);assert(c.metal[2][3]);assert.equal(c.ScoreDesign(),14);
});
test('silicon and metal connect only through vias',()=>{
  const c=blank(),e=new Editor(c);line(e,0,false,[[5,5],[9,5]]);line(e,1,false,[[5,5],[5,8]]);c.SimSetHot(5,5,true);assert(!c.siliconHot[9][5]);line(e,2,false,[[5,5]]);c.SimClearHot();c.SimSetHot(5,5,true);assert(c.siliconHot[9][5]);
});
test('N/P gates switch on the following tick, deletion invalidates broken gates',()=>{
  for(const p of [false,true]){const c=blank(),e=new Editor(c);line(e,0,p,[[10,10],[14,10]]);line(e,0,!p,[[12,8],[12,10]]);assert(c.gateHorizontal[12][10]);c.SimClearGates();c.SimCacheGates();assert.equal(c.gateActive[12][10],p);c.SimSetHot(12,8,false);assert.equal(c.gateActive[12][10],p);c.SimClearGates();c.SimCacheGates();assert.equal(c.gateActive[12][10],!p);line(e,4,false,[[11,10]]);assert(!c.gateHorizontal[12][10]);}
});
test('four actual inverters pass KT411I at 100%; broken output fails',()=>{
  const c=quadInverter();assert.equal(new Simulation(c,levels[0]).run(),100);c.DeleteSelection(30,7,1,1);assert(new Simulation(c,levels[0]).run()<97);
});
test('copy/paste is independent, protects boundaries and refuses collisions atomically',()=>{
  const c=quadInverter(),part=c.CopySelection(12,6,9,3);assert(part instanceof Canvas);const before=encode(c);assert.equal(c.Paste(12,6,part),false);assert.equal(encode(c),before);assert.equal(c.Paste(42,25,part),false);assert.equal(c.Paste(25,23,part),true);part.silicon[0][1]=0;assert.equal(c.silicon[25][24],2);const copy=c.Copy();copy.DeleteSelection(25,23,9,3);assert(c.silicon[25][24]);
});
test('JSON serialization preserves solvability and rejects invalid imports',()=>{
  const c=decode(encode(quadInverter()));assert.equal(new Simulation(c,levels[0]).run(),100);assert.throws(()=>decode('{'));assert.throws(()=>decode({width:100000,height:27}));const d=JSON.parse(encode(blank()));d.metalConnectedRight[43][0]=true;assert.throws(()=>decode(d));
});
test('legacy AMF3/zlib/Base64 round trip preserves original circuit',async()=>{
  const c=quadInverter(),text=await exportLegacy(c);assert(text.startsWith('eJ'));const restored=await importLegacy(text);assert.equal(encode(restored),encode(c));assert.equal(new Simulation(restored,levels[0]).run(),100);await assert.rejects(()=>importLegacy('broken'));
});
test('independently encoded AMF3 array-reference fixture',async()=>{
  // 2x1 empty fragment. Each writeObject resets refs; second column references first.
  const bytes=[4,2,4,1];for(let i=0;i<9;i++)bytes.push(9,5,1,9,3,1,...(i===0?[4,0]:[2]),9,2);
  const c=await importLegacy(deflateSync(new Uint8Array(bytes)).toString('base64'));assert.equal(c.width,2);assert.equal(c.height,1);assert.deepEqual(c.silicon,[[0],[0]]);
});

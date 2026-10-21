import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,Diagnostic} from './library-fixture.mjs';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const source='module root(input pin1,pin2,output pin8); rs_trigger memory(.r(pin2),.s(pin1),.out(pin8)); endmodule';
function build(code){const net=synthesize(parse(code)),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;return {net,layout,board};}
function simulate(board,patterns,outputs,length=100){
 const pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:outputs.includes(i),blocks:Array(Math.ceil(length/10)).fill(0)}));
 const sim=new Simulation(board,{id:'RS',length,pins});
 for(const [i,pattern]of Object.entries(patterns))sim.signals[Number(i)].pattern=pattern;
 sim.run();return sim;
}
test('RS preserves two independent N/P branches through the generic router',async()=>{
 const {net,layout,board}=build(source);assert.equal(net.rsTriggers.length,1);assert.equal(net.transistors.length,4);
 const [sn,hn,sp,hp]=net.transistors;assert.equal(sn.gate,'pin1');assert.equal(hn.gate,'pin8');assert.equal(sp.gate,'pin2');assert.equal(hp.gate,'pin2');
 assert.equal(sp.source,sn.drain);assert.equal(hp.source,hn.drain);assert.notEqual(sp.source,hp.source);assert.equal(sp.drain,hp.drain);
 assert.equal(board.gateHorizontal.flat().filter(Boolean).length+board.gateVertical.flat().filter(Boolean).length,4);
 assert.equal(gameEncode(await importLegacy(await exportLegacy(layout.board))),gameEncode(board));
});
test('set, hold, reset, simultaneous S/R and one-tick pulses; reset restarts state',()=>{
 const {board}=build(source),s=Array(100).fill(false),r=Array(100).fill(false);
 for(const t of [2,20,40,41,60,80])s[t]=true;
 for(const t of [10,20,42,60,61,90])r[t]=true;
 const sim=simulate(board,{0:s,1:r},[4]);
 const verify=()=>{let q=false;for(let t=0;t<100;t++){if(t)q=!r[t-1]&&(s[t-1]||q);assert.equal(sim.signals[4].values[t],q,`tick ${t}`);}};
 verify();sim.reset();sim.run();verify();
});
test('multiple latches, nested module, constant inputs and output alias',()=>{
 const code=`module root(input pin1,pin2,output pin8,pin7); wire q; wrap a(.r(pin2),.s(pin1),.q(q)); assign pin8=q; rs_trigger b(.r(1'b0),.s(pin2),.out(pin7)); endmodule module wrap(input r,s,output q); rs_trigger m(.r(r),.s(s),.out(q)); endmodule`;
 const {net,board}=build(code);assert.equal(net.rsTriggers.length,2);
 const s=Array.from({length:100},(_,i)=>i===5||i===40),r=Array.from({length:100},(_,i)=>i===20);
 const sim=simulate(board,{0:s,1:r},[4,5]);let q=false;
 for(let t=0;t<100;t++){if(t)q=!r[t-1]&&(s[t-1]||q);assert.equal(sim.signals[4].values[t],q);assert.equal(sim.signals[5].values[t],t>=21);}
});
test('RS ports, parameters, widths and drivers are validated',()=>{
 for(const call of ['rs_trigger x(.s(pin1),.out(pin8));','rs_trigger x(.r(pin2),.s(pin1),.out(pin8),.bad(pin1));','rs_trigger x(.r(pin2),.r(pin2),.s(pin1),.out(pin8));','rs_trigger #(.DEPTH(2)) x(.r(pin2),.s(pin1),.out(pin8));','rs_trigger x(.r(pin2),.s(pin1),.out(pin1));','rs_trigger x(.r(pin2),.s(pin1),.out(pin8)); assign pin8=~pin1;'])assert.throws(()=>synthesize(parse('module root(input pin1,pin2,output pin8);'+call+'endmodule')),Diagnostic);
});

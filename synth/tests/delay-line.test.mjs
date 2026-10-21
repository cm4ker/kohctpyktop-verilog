import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,Diagnostic} from '../src/parser.ts';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
function run(code,blocks,length=160){
 const net=synthesize(parse(code)),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
 const pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:i===4||i===5,blocks:blocks[i]??Array(Math.ceil(length/10)).fill(0)}));
 const sim=new Simulation(board,{id:'DELAY',length,pins});sim.run();return {net,layout,board,sim};
}
const hold=(values,t,d)=>t>=d&&Array.from({length:d+1},(_,i)=>values[t-i]).every(Boolean);
test('delay_line is the POR topology with an explicit input and no pre_out',()=>{
 const code='module root(input pin1, output pin8); delay_line #(.DEPTH(3)) d(.in(pin1),.out(pin8)); endmodule';
 const net=synthesize(parse(code));assert.equal(net.porChains.length,0);assert.equal(net.delayLines[0].depth,3);assert.equal(net.delayLines[0].input,'pin1');assert.equal(net.delayLines[0].preOutput,undefined);
 assert.equal(net.transistors.length,3);assert.equal(net.transistors[0].source,'pin1');assert(net.transistors.every(t=>t.source===t.gate));assert(!net.transistors.some(t=>t.source==='VCC'));
});
test('rising edges are delayed, falling edges immediate, short pulses rejected; export round-trips',async()=>{
 for(const depth of [1,3,10,17]){
  const code=`module root(input pin1,output pin8); delay_line #(.DEPTH(${depth})) d(.in(pin1),.out(pin8)); endmodule`;
  const {board,layout,sim}=run(code,{0:[0,1,1,1,0,1,0,2,1,1,0,1,1,1,1,0]});
  const input=sim.signals[0].pattern;
  for(let t=0;t<160;t++)assert.equal(sim.signals[4].values[t],hold(input,t,depth),`D${depth}, tick ${t}`);
  assert.equal(board.ScoreDesign(),layout.area);assert.equal(gameEncode(await importLegacy(await exportLegacy(layout.board))),gameEncode(board));
 }
});
test('scalar input aliases, logic-driven wires, cascades and POR output inputs',()=>{
 const codes=[
 ['module root(input pin1,output pin8); wire signal=pin1; delay_line #(.DEPTH(3)) d(.in(signal),.out(pin8)); endmodule',3,0],
 ['module root(input pin1,pin2,output pin8); wire signal=pin1&pin2; delay_line #(.DEPTH(3)) d(.in(signal),.out(pin8)); endmodule',3,1],
 ['module root(input pin1,output pin8); wire mid; delay_line #(.DEPTH(2)) a(.in(pin1),.out(mid)); delay_line #(.DEPTH(3)) b(.in(mid),.out(pin8)); endmodule',5,0]
 ];
 for(const[code,depth,extra]of codes){
  const {sim}=run(code,{0:[0,1,1,1,0,1,0,1,1,1,0,1,1,1,1,0],1:Array(16).fill(1)});
  const input=sim.signals[0].pattern;
  for(let t=0;t<160;t++)assert.equal(sim.signals[4].values[t],hold(input,t-extra,depth),`${code} t${t}`);
 }
 const {sim}=run('module root(output pin8,pin7); por #(.DEPTH(2)) p(.out(pin7)); delay_line #(.DEPTH(3)) d(.in(pin7),.out(pin8)); endmodule',{});
 for(let t=0;t<160;t++){assert.equal(sim.signals[5].values[t],t>=2);assert.equal(sim.signals[4].values[t],t>=5);}
});
test('delay_line validates ports, scalar input, drivers and DEPTH',()=>{
 for(const call of ['delay_line d(.out(pin8));','delay_line d(.in(pin1));','delay_line d(.in(pin1),.out(pin8),.pre_out(pin7));','delay_line d(.in(pin1),.in(pin1),.out(pin8));','delay_line d(.in(pin8),.out(pin8));','delay_line #(.DEPTH(0)) d(.in(pin1),.out(pin8));'])assert.throws(()=>synthesize(parse('module root(input pin1,output pin8);'+call+' endmodule')),Diagnostic);
 assert.throws(()=>synthesize(parse('module root(input pin1,pin2,output pin8); wire [1:0] bus={pin1,pin2}; delay_line d(.in(bus),.out(pin8)); endmodule')),Diagnostic);
 assert.throws(()=>synthesize(parse('module root(output pin8); delay_line d(.in(missing),.out(pin8)); endmodule')),Diagnostic);
});

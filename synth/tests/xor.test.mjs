import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse,Diagnostic} from '../src/parser.ts';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const source=readFileSync(new URL('../examples/adder.v',import.meta.url),'utf8');
test('two-bit adder with constant carry-in routes and adds all 16 input combinations',async()=>{
 const net=synthesize(parse(source)),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
 assert(!net.transistors.some(t=>t.gate.includes('$constant')));
 const pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:[4,5,7].includes(i),blocks:Array.from({length:16},(_,mask)=>(mask>>i)&1)}));
 const sim=new Simulation(board,{id:'ADD',length:160,pins});sim.run();
 for(let t=1;t<160;t++){
  const v=[0,1,2,3].map(i=>Number(sim.signals[i].pattern[t-1])),sum=v[0]+2*v[1]+v[2]+2*v[3];
  assert.equal(sim.signals[4].values[t],Boolean(sum&1),`sum0 tick${t}`);
  assert.equal(sim.signals[5].values[t],Boolean(sum&2),`sum1 tick${t}`);
  assert.equal(sim.signals[7].values[t],Boolean(sum&4),`carry tick${t}`);
 }
 assert.equal(gameEncode(await importLegacy(await exportLegacy(layout.board))),gameEncode(board));
});
test('zero carry-in removes gates; XOR constants and port constants simplify',()=>{
 const half=source.replace(/sum s2[^;]+;/,'assign {pin7,pin5}=2\'b00;');
 const net=synthesize(parse(half));assert.equal(net.transistors.length,4);
 for(const [expr,count] of [["pin1 ^ 1'b0",0],["pin1 ^ 1'b1",1],["pin1 & 1'b0",0],["pin1 | 1'b0",0]]){
  assert.equal(synthesize(parse(`module root(input pin1,output pin8);assign pin8=${expr};endmodule`)).transistors.length,count);
 }
 assert.throws(()=>synthesize(parse(source.replace(".s(pin8)",".s(1'b0)"))),Diagnostic);
 assert.throws(()=>synthesize(parse(source.replace("1'b0","2'b0"))),Diagnostic);
});
test('XOR precedence is between AND and OR; bus widths are checked',()=>{
 const ast=parse('module root(input pin1,pin2,pin3,pin4,output pin8); assign pin8=pin1|pin2^pin3&pin4; endmodule');
 const e=ast.assignments[0].expression;assert.equal(e.operator,'|');assert.equal(e.right.operator,'^');assert.equal(e.right.right.operator,'&');
 assert.throws(()=>synthesize(parse("module root(input pin1,output pin8);assign pin8=pin1^2'b00;endmodule")),Diagnostic);
});

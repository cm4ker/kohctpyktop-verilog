import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,Diagnostic} from '../synth/src/parser.ts';
import {parseWithLibrary} from '../synth/src/user-library.ts';
import {synthesize} from '../synth/src/synthesis.ts';
import {route} from '../synth/src/routing.ts';
import {permuteSeries} from '../synth/src/optimization.ts';
import {encode} from '../synth/src/board.ts';
import {decode} from '../game/storage.js';
import {Simulation} from '../game/simulation.js';
import {levels} from '../game/levels.js';
import {moduleTemplate} from '../src/level-template.ts';
import {validateLibrary} from '../synth/src/library-manager.ts';
import {systemLibrary,verifySolutions} from '../scripts/verify-solutions.mjs';
const root=body=>'module root(input pin1,pin2,output pin8);'+body+'endmodule';
function simulation(net){const board=decode(encode(route(net).board));board.mainCanvasLock=true;const pins=Array.from({length:8},(_,i)=>({name:`p${i}`,output:i===4,blocks:i===0?[0,1,0,1,1,0,1,0]:i===1?[0,0,1,1,0,1,0,0]:Array(8).fill(0)}));const sim=new Simulation(board,{id:'TEST',length:80,pins});sim.run();return sim;}
test('AND-NOT uses one P and bypasses the source delay',()=>{
 const net=synthesize(parse(root('assign pin8=pin1&~pin2;')),{optimize:true});assert.equal(net.transistors.length,1);assert.equal(net.transistors[0].source,'pin1');
 const sim=simulation(net);for(let t=0;t<80;t++)assert.equal(sim.signals[4].values[t],sim.signals[0].pattern[t]&&!sim.signals[1].pattern[t-1]);
});
test('OR joins only terminal output nets; another consumer prevents merging',()=>{
 const body="wire a,b;transistor_n a1(.s(1'b1),.g(pin1),.d(a)),b1(.s(1'b1),.g(pin2),.d(b));assign pin8=a|b;";
 const net=synthesize(parse(root(body)),{optimize:true});assert.equal(net.transistors.length,2);assert(net.transistors.every(t=>t.drain==='pin8'));
 const sim=simulation(net);for(let t=1;t<80;t++)assert.equal(sim.signals[4].values[t],sim.signals[0].pattern[t-1]||sim.signals[1].pattern[t-1]);
 const guarded=root(body).replace('output pin8','output pin8,pin7').replace('endmodule','assign pin7=~a;endmodule');assert.equal(synthesize(parse(guarded),{optimize:true}).transistors.length,5);
});
test('XOR follows the four-transistor source topology and truth table',()=>{
 const net=synthesize(parse(root('assign pin8=pin1^pin2;')),{optimize:true});assert.equal(net.transistors.length,4);assert.equal(net.transistors.filter(t=>t.source==='VCC').length,2);
 const sim=simulation(net);for(let t=1;t<80;t++)assert.equal(sim.signals[4].values[t],sim.signals[0].pattern[t-1]!==sim.signals[1].pattern[t-1]);
});
test('series permutation preserves endpoints and avoids tapped intermediate nets',()=>{
 const net=synthesize(parse(root('assign pin8=pin1&pin2;'))),permuted=permuteSeries(net,1);assert.notDeepEqual(permuted,net.transistors);assert.equal(permuted.find(t=>t.source==='VCC').gate,'pin2');
 net.bindings.push({name:'pin7',number:7,direction:'output',point:[41,11],net:net.transistors[0].drain});assert.deepEqual(permuteSeries(net,1),net.transistors);
});
test('parameterized Verilog library replaces built-in delay/POR/RS devices',async()=>{
 const files=await systemLibrary();
 for(const depth of [1,2,10,17,64]){
  const net=synthesize(parseWithLibrary(`module root(output pin8);por #(.DEPTH(${depth})) p(.out(pin8));endmodule`,files),{optimize:true});assert.equal(net.transistors.length,depth);
  const sim=simulation(net);for(let t=0;t<80;t++)assert.equal(sim.signals[4].values[t],t>=depth);
 }
 assert.throws(()=>synthesize(parseWithLibrary('module root(output pin8);por p(.out(pin8));endmodule',{})),Diagnostic);
});
test('level templates preserve physical pin numbering and library state validates imports',()=>{
 for(const level of levels){const ast=parse(moduleTemplate(level));for(const port of ast.ports){const n=Number(port.name.slice(3)),pin=level.pins[n<=4?n-1:12-n];assert.equal(port.direction,pin.output?'output':'input');}}
 assert.throws(()=>validateLibrary({version:1,users:[{}],enabledSystem:[]}));assert.deepEqual(validateLibrary({version:1,users:[],enabledSystem:[]}).users,[]);
});
test('latest solutions.v variants meet the real level grading threshold',async()=>{
 const report=await verifySolutions();assert(report.passed,JSON.stringify(report.results.filter(r=>r.required&&!r.passed)));assert.equal(report.results.filter(r=>r.required).length,11);assert.equal(report.absent.length,8);
});
test('logical OR reduces vectors to one bit, unlike bitwise OR',()=>{
 const net=synthesize(parse(root('wire [1:0] a={pin1,pin1},b={pin2,pin2};assign pin8=a||b;')),{optimize:true});
 const sim=simulation(net);for(let t=1;t<80;t++)assert.equal(sim.signals[4].values[t],sim.signals[0].pattern[t-1]||sim.signals[1].pattern[t-1]);
 assert.throws(()=>synthesize(parse(root('wire [1:0] a={pin1,pin1},b={pin2,pin2};assign pin8=a|b;'))),Diagnostic);
});

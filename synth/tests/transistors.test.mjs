import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse,Diagnostic} from '../src/parser.ts';
import {parseWithLibrary} from '../src/user-library.ts';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const files={'library/positive_edge_detector.v':readFileSync(new URL('../library/positive_edge_detector.v',import.meta.url),'utf8')};
const source='module root(input pin1,output pin8);positive_edge_detector edge1(.in(pin1),.out(pin8));endmodule';
function physical(code,library={}){
 const net=synthesize(parseWithLibrary(code,library)),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;return {net,layout,board};
}
function simulate(board,patterns,length=80){
 const pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:i===4||i===5,blocks:Array(length/10).fill(0)}));
 const sim=new Simulation(board,{id:'DEVICES',length,pins});for(const [i,p]of Object.entries(patterns))sim.signals[i].pattern=p;sim.run();return sim;
}
test('library edge detector preserves three devices and emits one pulse on each rise',async()=>{
 const {net,board}=physical(source,files);assert.equal(net.transistors.length,3);
 assert.deepEqual(net.transistors.map(t=>t.type),['N','N','P']);assert.equal(net.transistors[0].source,'VCC');assert.equal(net.transistors[1].source,'VCC');
 assert.equal(net.transistors[2].source,net.transistors[0].drain);assert.equal(net.transistors[2].gate,net.transistors[1].drain);
 const pattern=Array.from({length:80},(_,i)=>i===2||(i>=10&&i<30)||(i>=40&&i<43)||i>=60);
 const sim=simulate(board,{0:pattern});
 for(let t=0;t<80;t++)assert.equal(sim.signals[4].values[t],Boolean(pattern[t-1]&&!pattern[t-2]),`tick ${t}`);
 sim.reset();sim.run();assert.equal(sim.signals[4].values[0],false);
 assert.equal(gameEncode(await importLegacy(await exportLegacy(board))),gameEncode(board));
});
test('explicit P source is a signal, N/P constants and parallel drains work',()=>{
 const code="module root(input pin1,pin2,output pin8,pin7);transistor_p p(.s(pin1),.g(pin2),.d(pin8));transistor_n a(.s(1'b1),.g(pin1),.d(pin7)), b(.s(1'b1),.g(pin2),.d(pin7));endmodule";
 const {board,net}=physical(code);assert.equal(net.transistors.length,3);
 const a=Array.from({length:80},(_,i)=>i%7<3),b=Array.from({length:80},(_,i)=>i%11<5),sim=simulate(board,{0:a,1:b});
 for(let t=0;t<80;t++){assert.equal(sim.signals[4].values[t],a[t]&&!b[t-1]);assert.equal(sim.signals[5].values[t],Boolean(a[t-1]||b[t-1]));}
 const single=physical('module root(input pin1,pin2,output pin8);transistor_p p(.s(pin1),.g(pin2),.d(pin8));endmodule');assert.equal(single.net.transistors.length,1);
});
test('custom library files compose, nested instances isolate signals and diagnostics name the file',()=>{
 const library={...files,'library/wrapper.v':'module wrapper(input a,output z);positive_edge_detector edge1(.in(a),.out(z));endmodule'};
 const net=synthesize(parseWithLibrary('module root(input pin1,pin2,output pin8,pin7);wrapper a(.a(pin1),.z(pin8)),b(.a(pin2),.z(pin7));endmodule',library));
 assert.equal(net.transistors.length,6);assert.equal(new Set(net.transistors.map(t=>t.id)).size,6);
 assert.throws(()=>parseWithLibrary(source,{'library/bad.v':'module broken('}),e=>e instanceof Diagnostic&&e.span.source==='library/bad.v');
 assert.throws(()=>synthesize(parseWithLibrary(source,{...files,'library/duplicate.v':files['library/positive_edge_detector.v']})),Diagnostic);
});
test('device ports and drivers are validated',()=>{
 for(const call of ["transistor_n a(.s(1'b1),.d(pin8));","transistor_n a(.s(1'b1),.g(pin1),.d(1'b0));","transistor_n a(.s(1'b1),.g(pin1),.d(pin1));","transistor_n a(.s(2'b11),.g(pin1),.d(pin8));","transistor_n a(.s(1'b1),.g(pin1),.g(pin1),.d(pin8));","transistor_n a(.s(1'b1),.g(pin1),.d(pin8));assign pin8=~pin1;"]){assert.throws(()=>synthesize(parse('module root(input pin1,output pin8);'+call+'endmodule')),Diagnostic);}
});

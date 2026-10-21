import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,Diagnostic} from './library-fixture.mjs';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const source=d=>`module root(output pin8); por #(.DEPTH(${d})) startup (.out(pin8)); endmodule`;
function simulate(board,outputs=[4],length=90){
 board.mainCanvasLock=true;const level={id:'POR',length,pins:Array.from({length:8},(_,i)=>({name:`P${i}`,output:outputs.includes(i),blocks:Array(Math.ceil(length/10)).fill(0)}))};
 const sim=new Simulation(board,level);sim.run();return sim;
}
test('POR instance AST and source-tied N chain match the reference wiring',()=>{
 const ast=parse(source(4));assert.equal(ast.instances[0].module,'por');assert.equal(ast.instances[0].parameters[0].value,4);
 const net=synthesize(ast);assert.equal(net.transistors.length,4);assert.equal(net.porChains[0].permutable,false);assert.equal(net.seriesGroups.length,0);
 for(let i=0;i<4;i++){
  const t=net.transistors[i];assert.equal(t.type,'N');assert.equal(t.source,t.gate);assert.equal(t.source,i?net.transistors[i-1].drain:'VCC');
 }
 assert.equal(net.transistors[3].drain,'pin8');
 const layout=route(net),b=layout.board;
 assert.equal(b.gateHorizontal.flat().filter(Boolean).length+b.gateVertical.flat().filter(Boolean).length,4);
});
test('POR depths including wrapped lines delay exactly DEPTH ticks and restart cleanly',async()=>{
 for(const depth of [1,2,4,10,16,17,32,64]){
  const net=synthesize(parse(source(depth))),layout=route(net),board=decode(encode(layout.board));
  assert.equal(board.gateHorizontal.flat().filter(Boolean).length+board.gateVertical.flat().filter(Boolean).length,depth);
  const sim=simulate(board);for(let t=0;t<90;t++)assert.equal(sim.signals[4].values[t],t>=depth,`DEPTH ${depth}, tick ${t}`);
  sim.reset();sim.run();for(let t=0;t<90;t++)assert.equal(sim.signals[4].values[t],t>=depth);
  const legacy=await importLegacy(await exportLegacy(layout.board));assert.equal(gameEncode(legacy),gameEncode(board));
  assert.equal(board.ScoreDesign(),layout.area);
 }
});
test('POR default, multiple instances, internal wires and output fan-out',()=>{
 assert.equal(synthesize(parse('module root(output pin8); por boot(.out(pin8)); endmodule')).porChains[0].depth,10);
 const cases=[
  ['module root(output pin8,pin7); por #(.DEPTH(2)) a(.out(pin8)); por #(.DEPTH(5)) b(.out(pin7)); endmodule',2,5,false],
  ['module root(output pin8,pin7); wire ready; por #(.DEPTH(3)) boot(.out(ready)); assign pin8=ready, pin7=~ready; endmodule',3,4,true],
  ['module root(output pin8,pin7); wire ready; por #(.DEPTH(3)) boot(.out(ready)); assign pin8=ready, pin7=ready; endmodule',3,3,false]
 ];
 for(const[code,a,b,invert]of cases){const board=decode(encode(route(synthesize(parse(code))).board)),sim=simulate(board,[4,5]);for(let t=0;t<90;t++){assert.equal(sim.signals[4].values[t],t>=a,`${code}, pin8, tick ${t}`);assert.equal(sim.signals[5].values[t],invert?t<b:t>=b,`${code}, pin7, tick ${t}`);}}
});
test('POR rejects invalid parameters, instances and connections',()=>{
 for(const code of [source(0),source(65),source(1).replace('DEPTH','WIDTH'),source(1).replace('.DEPTH(1)','.DEPTH(1),.DEPTH(2)'),source(1).replace('.out(pin8)','.reset(pin8)'),source(1).replace('.out(pin8)','.out(pin1)'),source(1).replace('por #','unknown #'),'module root(output pin8); wire [3:0] ready; por a(.out(ready)); assign pin8=|ready; endmodule','module root(input pin1,output pin8); wire ready=pin1; por a(.out(ready)); assign pin8=~ready; endmodule'])assert.throws(()=>synthesize(parse(code)),Diagnostic,code);
});
test('reading a POR output port preserves the normal inverter delay',()=>{
 const code='module root(output pin6,pin7); por #(.DEPTH(10)) startup(.out(pin6)); assign pin7=~pin6; endmodule';
 const board=decode(encode(route(synthesize(parse(code))).board)),sim=simulate(board,[5,6]);
 for(let t=0;t<90;t++){assert.equal(sim.signals[6].values[t],t>=10);assert.equal(sim.signals[5].values[t],t<11);}
});
test('pre_out is exactly one tick earlier; its inversion is synchronous with out',()=>{
 for(const depth of [1,2,10,17]){
  for(const useWire of [false,true]){
   const code=useWire?`module root(output pin6,pin7); wire early; por #(.DEPTH(${depth})) boot(.pre_out(early),.out(pin6)); assign pin7=~early; endmodule`:`module root(output pin5,pin6,pin7); por #(.DEPTH(${depth})) boot(.out(pin6),.pre_out(pin5)); assign pin7=~pin5; endmodule`;
   const net=synthesize(parse(code));assert.equal(net.transistors.length,depth+(depth===1?0:1));
   const board=decode(encode(route(net).board)),sim=simulate(board,[5,6,7]);
   for(let t=0;t<90;t++){assert.equal(sim.signals[6].values[t],t>=depth,`out D${depth} t${t}`);assert.equal(sim.signals[5].values[t],depth>1&&t<depth,`inverted pre_out D${depth} t${t}`);if(!useWire)assert.equal(sim.signals[7].values[t],t>=depth-1,`pre_out D${depth} t${t}`);}
  }
 }
});
test('DEPTH=1 pre_out is VCC, including wire alias and multiple output taps',()=>{
 const code='module root(output pin6,pin7,pin8); wire early; por #(.DEPTH(1)) boot(.out(pin6),.pre_out(early)); assign pin7=early,pin8=early; endmodule';
 const net=synthesize(parse(code));assert(net.bindings.filter(b=>['pin7','pin8'].includes(b.name)).every(b=>b.net==='VCC'));assert.equal(net.transistors[0].source,'VCC');
 const sim=simulate(decode(encode(route(net).board)),[4,5,6]);for(let t=0;t<90;t++){assert(sim.signals[4].values[t]);assert(sim.signals[5].values[t]);assert.equal(sim.signals[6].values[t],t>=1);}
});
test('POR pre_out rejects duplicate ports and drivers',()=>{
 for(const ports of ['.out(pin8),.pre_out(pin8)','.out(pin8),.pre_out(pin7),.pre_out(pin7)','.pre_out(pin8)'])assert.throws(()=>synthesize(parse(`module root(output pin8,pin7); por b(${ports}); endmodule`)),Diagnostic);
 assert.throws(()=>synthesize(parse('module root(output pin8,pin7); por b(.out(pin8),.pre_out(pin7)); assign pin7=~pin8; endmodule')),Diagnostic);
});

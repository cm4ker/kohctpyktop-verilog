import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,Diagnostic} from '../src/parser.ts';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode} from '../src/board.ts';
import {decode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const osc=`module osc(input en, output out);
wire dl1_in = en & ~dl2_out;
wire mid, dl2_out;
delay_line #(.DEPTH(9)) dl1(.in(dl1_in), .out(mid));
delay_line #(.DEPTH(9)) dl2(.in(mid), .out(dl2_out));
assign out = en & ~mid;
endmodule`;
const example=`module root(input pin1, input pin8, output pin4, output pin5);
osc osc1(.en(pin1), .out(pin4));
osc osc2(.en(pin8), .out(pin5));
endmodule\n${osc}`;
test('two independent feedback oscillators elaborate, route and simulate',()=>{
 const ast=parse(example),net=synthesize(ast);
 assert.equal(ast.definitions.length,2);assert.equal(net.delayLines.length,4);assert.equal(net.transistors.length,44);
 assert.deepEqual(net.delayLines.map(d=>d.instance),['osc1.dl1','osc1.dl2','osc2.dl1','osc2.dl2']);
 const layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
 const length=240,pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:i===3||i===7,blocks:i===0?Array(24).fill(1):i===4?[0,0,...Array(13).fill(1),...Array(9).fill(0)]:Array(24).fill(0)}));
 const sim=new Simulation(board,{id:'OSC',length,pins});sim.run();
 for(const [input,output]of [[0,3],[4,7]]){
  let previous=Array(19).fill(false),prevEn=false;
  for(let t=0;t<length;t++){
   const en=sim.signals[input].pattern[t],current=[prevEn&&!previous[18]];
   for(let i=1;i<=18;i++)current[i]=current[i-1]&&previous[i-1];
   assert.equal(sim.signals[output].values[t],prevEn&&!previous[9],`input ${input}, tick ${t}`);
   previous=current;prevEn=en;
  }
 }
});
test('nested modules, definition order, local buses and repeated instances',()=>{
 const code=`module inv(input a,output z); wire [1:0] b={a,a}; assign z=~&b; endmodule
 module wrap(input a,output z); inv inner(.a(a),.z(z)); endmodule
 module root(input pin1,pin2,output pin7,pin8); wrap a(.a(pin1),.z(pin8)); wrap b(.a(pin2),.z(pin7)); endmodule`;
 // Keep the supported unary subset: inverted scalar selected from a local bus.
 const net=synthesize(parse(code.replace('~&b','~b[0]')));
 assert.equal(net.transistors.length,2);assert.deepEqual(net.transistors.map(t=>t.gate),['pin1','pin2']);
});
test('module diagnostics reject bad hierarchy and connections',()=>{
 const root=call=>`module root(input pin1,output pin8); ${call} endmodule`;
 for(const code of [
 root('missing x(.a(pin1));'),
 root('osc x(.en(pin1));')+osc,
 root('osc x(.en(pin1),.out(pin8),.bad(pin1));')+osc,
 root('osc x(.en(pin1),.en(pin1),.out(pin8));')+osc,
 root('osc x(.en(pin1),.out(pin1));')+osc,
 root('osc x(.en(missing),.out(pin8));')+osc,
 root('osc x(.en(pin1),.out(pin8));')+osc+osc,
 root('r x(.a(pin1),.z(pin8));')+'module r(input a,output z); r x(.a(a),.z(z)); endmodule',
 root('wire [1:0] b={pin1,pin1}; osc x(.en(b),.out(pin8));')+osc,
 root('osc #(.DEPTH(3)) x(.en(pin1),.out(pin8));')+osc,
 root('osc x(.en(pin1),.out(pin8)); osc y(.en(pin1),.out(pin8));')+osc
 ])assert.throws(()=>synthesize(parse(code)),Diagnostic,code);
});
export {example};

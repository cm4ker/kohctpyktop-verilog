import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,Diagnostic} from '../src/parser.ts';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const head='module root(input pin1,pin2,pin3,pin4,output pin6,pin7);';
export const userSource=head+'wire [3:0] values = {pin1,pin2,pin3,pin4}; assign pin6=|values, pin7=&values; endmodule';
async function physical(code,expected){
 const net=synthesize(parse(code)),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
 assert.equal(board.ScoreDesign(),layout.area);
 assert.equal(board.gateHorizontal.flat().filter(Boolean).length+board.gateVertical.flat().filter(Boolean).length,net.transistors.length);
 const pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:i===5||i===6,blocks:Array.from({length:16},(_,mask)=>(mask>>i)&1)}));
 const sim=new Simulation(board,{id:'BUS',length:160,pins});sim.run();
 for(let t=1;t<160;t++){
  const inputs=[0,1,2,3].map(i=>sim.signals[i].pattern[t-1]);const values=expected(inputs);
  assert.equal(sim.signals[6].values[t],values[0],`pin6 tick ${t}, ${code}`);
  assert.equal(sim.signals[5].values[t],values[1],`pin7 tick ${t}, ${code}`);
 }
 const restored=await importLegacy(await exportLegacy(layout.board));assert.equal(gameEncode(restored),gameEncode(board));
 return {net,layout};
}
test('user bus example resolves four aliases and emits parallel OR plus series AND',async()=>{
 const ast=parse(userSource);assert.equal(ast.wires[0].kind,'WireDeclaration');assert.equal(ast.wires[0].msb,3);assert.equal(ast.wires[0].lsb,0);
 assert.equal(ast.assignments[0].expression.operator,'|');assert.equal(ast.assignments[1].expression.operator,'&');
 const {net}=await physical(userSource,v=>[v.some(Boolean),v.every(Boolean)]);
 assert.equal(net.transistors.length,8);assert(net.transistors.every(t=>t.type==='N'));
 assert.deepEqual(net.transistors.slice(0,4).map(t=>[t.source,t.drain,t.gate]),[['VCC','pin6','pin1'],['VCC','pin6','pin2'],['VCC','pin6','pin3'],['VCC','pin6','pin4']]);
 assert.equal(net.parallelGroups.length,1);assert.equal(net.seriesGroups.length,1);assert(net.seriesGroups[0].permutable);
 assert.deepEqual(net.wires,[{name:'values',msb:3,lsb:0,width:4}]);
});
test('binary OR, AND precedence and series-parallel composition work for all input combinations',async()=>{
 await physical(head+'assign pin6=pin1 | pin2 & pin3, pin7=(pin1|pin2)&(pin3|pin4); endmodule',([a,b,c,d])=>[a||(b&&c),(a||b)&&(c||d)]);
 await physical(head+'assign pin6=~pin1 | pin2, pin7=pin1 & ~pin2; endmodule',([a,b])=>[!a||b,a&&!b]);
 const ast=parse(head+'assign pin6=pin1|pin2&pin3,pin7=~pin1; endmodule');assert.equal(ast.assignments[0].expression.operator,'|');assert.equal(ast.assignments[0].expression.right.operator,'&');
});
test('bus indexing preserves descending and ascending declaration order',async()=>{
 await physical(head+'wire [3:0] v={pin1,pin2,pin3,pin4}; assign pin6=~v[3], pin7=~v[0]; endmodule',([a,b,c,d])=>[!a,!d]);
 await physical(head+'wire [0:3] v={pin1,pin2,pin3,pin4}; assign pin6=~v[0], pin7=~v[3]; endmodule',([a,b,c,d])=>[!a,!d]);
 await physical(head+'wire [7:4] v={pin1,pin2,pin3,pin4}; assign pin6=|v[7:6], pin7=&v[5:4]; endmodule',([a,b,c,d])=>[a||b,c&&d]);
 await physical(head+'wire [4:7] v={pin1,pin2,pin3,pin4}; assign pin6=|v[4:5], pin7=&v[6:7]; endmodule',([a,b,c,d])=>[a||b,c&&d]);
});
test('wire assign, forward aliases, bitwise bus operations and reductions compose',async()=>{
 await physical(head+'wire [3:0] values; assign values=alias; wire [3:0] alias={pin1,pin2,pin3,pin4}; assign pin6=|values,pin7=&values; endmodule',v=>[v.some(Boolean),v.every(Boolean)]);
 await physical(head+'wire [1:0] a={pin1,pin2},b={pin3,pin4}; wire [1:0] both=a&b; assign pin6=|both,pin7=&(a|b); endmodule',([a,b,c,d])=>[(a&&c)||(b&&d),(a||c)&&(b||d)]);
 await physical(head+'wire [3:0] v={pin1,pin2,pin3,pin4}; assign {pin6,pin7}=~v[3:2]; endmodule',([a,b])=>[!a,!b]);
});
test('wire diagnostics reject multiple drivers, cycles, widths, ranges and unsupported operations',()=>{
 const bad=[
 'wire [3:0] v={pin1,pin2}; assign pin6=|v,pin7=&v;',
 'wire [3:0] v; assign pin6=|v,pin7=&v;',
 'wire [3:0] v=w,w=v; assign pin6=|v,pin7=&v;',
 'wire [3:0] v=v; assign pin6=|v,pin7=&v;',
 'wire [3:0] v={pin1,pin2,pin3,pin4}; assign v={pin1,pin2,pin3,pin4},pin6=|v,pin7=&v;',
 'wire pin1=pin2; assign pin6=|pin1,pin7=&pin2;',
 'wire [3:0] v={pin1,pin2,pin3,pin4}; assign pin6=|v[4],pin7=&v;',
 'wire [3:0] v={pin1,pin2,pin3,pin4}; assign pin6=|v[0:2],pin7=&v;',
 'wire [0:3] v={pin1,pin2,pin3,pin4}; assign pin6=|v[3:1],pin7=&v;',
 'assign pin6=pin1||pin2,pin7=~pin1;',
 'assign pin6=pin1&&pin2,pin7=~pin1;',
 'assign pin6=^pin1,pin7=~pin1;',
 'assign pin6=~(pin1|pin2),pin7=~pin1;',
 ];
 for(const body of bad)assert.throws(()=>synthesize(parse(head+body+' endmodule')),Diagnostic,body);
});

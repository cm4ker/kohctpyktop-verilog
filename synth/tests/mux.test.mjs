import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {levels} from '../../game/levels.js';
import {parse,Diagnostic} from '../src/parser.ts';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const header='module root(input pin1,pin2,pin3,pin4,pin6,pin7,output pin8);';
const body='wire [3:0] data={pin1,pin2,pin3,pin4}; wire [1:0] sel={pin7,pin6}; assign pin8=data[sel];';
const source=header+body+' endmodule';
test('bundled 4-to-1 example passes the KM141P level with DIP selector pins',()=>{
 const code=readFileSync(new URL('../examples/mux.v',import.meta.url),'utf8');
 const net=synthesize(parse(code),{optimize:true}),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
 const level=levels.find(l=>l.id==='KM141P');
 assert.deepEqual(net.bindings.filter(b=>b.direction==='input').map(b=>b.number),[1,2,3,4,5,6]);
 const sim=new Simulation(board,level);assert.equal(sim.run(),100);
});
async function check(code,expected){
 const net=synthesize(parse(code)),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
 const pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:i===4,blocks:Array.from({length:64},(_,mask)=>(mask>>([0,1,2,3,-1,5,4,-1][i]))&1)}));
 const sim=new Simulation(board,{id:'MUX',length:640,pins});sim.run();
 for(let t=1;t<640;t++){
  const v=[0,1,2,3,6,5].map(i=>sim.signals[i].pattern[t-1]);
  assert.equal(sim.signals[4].values[t],expected(v),`tick ${t}: ${v}`);
 }
 assert.equal(gameEncode(await importLegacy(await exportLegacy(layout.board))),gameEncode(board));
 return net;
}
test('dynamic select lowers to four decoded AND branches and routes all 64 combinations',async()=>{
 assert.equal(parse(source).assignments[0].expression.kind,'DynamicSelection');
 const net=await check(source,([a,b,c,d,lo,hi])=>[d,c,b,a][Number(lo)+2*Number(hi)]);
 assert.equal(net.transistors.length,12);assert.equal(net.seriesGroups.length,4);
 assert.equal(net.transistors.filter(t=>t.type==='P').length,4);
});
test('ascending ranges, nonzero indices, short and wide selectors',async()=>{
 await check(source.replace('[3:0] data','[0:3] data'),([a,b,c,d,lo,hi])=>[a,b,c,d][Number(lo)+2*Number(hi)]);
 await check(header+'wire [2:1] data={pin1,pin2}; wire [1:0] sel={pin7,pin6}; assign pin8=data[sel]; endmodule',([a,b,c,d,lo,hi])=>[false,b,a,false][Number(lo)+2*Number(hi)]);
 await check(source.replace('data[sel]','data[pin6]'),([a,b,c,d,lo])=>lo?c:d);
});
test('selector expressions and module-local names are elaborated',async()=>{
 await check(source.replace('data[sel]','data[~sel]'),([a,b,c,d,lo,hi])=>[a,b,c,d][Number(lo)+2*Number(hi)]);
 await check(header+'m mux(.a(pin1),.b(pin2),.s(pin6),.t(pin7),.z(pin8)); endmodule module m(input a,b,s,t,output z); wire [1:0] data={a,b}; assign z=data[s&t]; endmodule',([a,b,c,d,lo,hi])=>lo&&hi?a:b);
});
test('invalid selectors report diagnostics and constant selections remain unchanged',()=>{
 for(const value of ['missing','sel[8]','sel:pin1'])assert.throws(()=>synthesize(parse(source.replace('data[sel]',`data[${value}]`))),Diagnostic);
 assert.throws(()=>synthesize(parse(source.replace('[3:0] data','[7:4] data'))),Diagnostic);
 assert.equal(parse(source.replace('data[sel]','data[2]')).assignments[0].expression.kind,'Selection');
});

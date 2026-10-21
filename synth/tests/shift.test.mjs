import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,Diagnostic} from '../src/parser.ts';
import {synthesize} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const head='module root(input pin2,pin3,output pin5,pin6,pin7,pin8); wire [1:0] sel={pin2,pin3};';
const code=expression=>head+`assign {pin8,pin7,pin6,pin5}=${expression}; endmodule`;
async function check(source,expected,lag=1){
 const net=synthesize(parse(source)),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
 const pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:i>=4,blocks:Array.from({length:4},(_,s)=>i===1?(s>>1)&1:i===2?s&1:0)}));
 const sim=new Simulation(board,{id:'DECODER',length:40,pins});sim.run();
 for(let t=1;t<40;t++){
  const s=Number(sim.signals[1].pattern[t-lag])*2+Number(sim.signals[2].pattern[t-lag]);
  for(let bit=0;bit<4;bit++)assert.equal(sim.signals[7-bit].values[t],Boolean(expected(s)&(1<<bit)),`tick ${t}, bit ${bit}`);
 }
 assert.equal(gameEncode(await importLegacy(await exportLegacy(layout.board))),gameEncode(board));return net;
}
test('user decoder emits four two-literal branches with correct DIP outputs',async()=>{
 const source=code("4'b1 << sel"),ast=parse(source);
 assert.equal(ast.assignments[0].expression.operator,'<<');assert.equal(ast.assignments[0].expression.left.bits,'0001');
 const net=await check(source,s=>1<<s);assert.equal(net.transistors.length,8);
});
test('shift truncation, constant zero/one, literal width, concatenation and precedence',async()=>{
 await check(code("4'b0011 << sel"),s=>(3<<s)&15);
 await check(code("4'b1000 << sel"),s=>(8<<s)&15);
 await check(code("4'b0 << sel"),()=>0);
 await check(code("4'b1111"),()=>15);
 await check(code("4'b1_0010"),()=>2);
 await check(code("4'b1 << sel & 4'b0101"),s=>(1<<s)&5);
 await check(code("{sel,sel} << 2'b01"),s=>((s*5)<<1)&15,0);
});
test('decoder works inside user modules and rejects unsupported literals or missing semicolon',async()=>{
 await check('module root(input pin2,pin3,output pin5,pin6,pin7,pin8); d x(.a(pin2),.b(pin3),.w(pin8),.x(pin7),.y(pin6),.z(pin5)); endmodule module d(input a,b,output w,x,y,z); wire [1:0] s={a,b}; assign {w,x,y,z}=4\'b1<<s; endmodule',s=>1<<s);
 for(const expr of ["0'b1 << sel","65'b1 << sel","4'bx << sel","4'h1 << sel","4'b102 << sel"]){assert.throws(()=>synthesize(parse(code(expr))),Diagnostic);}
 assert.throws(()=>parse(code("4'b1 << sel").replace('; endmodule',' endmodule')),Diagnostic);
});

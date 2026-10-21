import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,Diagnostic} from '../src/parser.ts';
import {synthesize,pinPoint} from '../src/synthesis.ts';
import {route} from '../src/routing.ts';
import {encode,exportLegacy,score} from '../src/board.ts';
import {decode,importLegacy,encode as gameEncode} from '../../game/storage.js';
import {Simulation} from '../../game/simulation.js';
const source=(a=1,b=8)=>`module root(input pin${a}, output pin${b}); assign pin${b} = ~pin${a}; endmodule`;
test('AST retains unary operator, declarations and source locations',()=>{
 const ast=parse('// header\nmodule root(input wire pin1, output pin8); /* comment */\n assign pin8 = ~(pin1); endmodule');
 assert.equal(ast.kind,'Module');assert.equal(ast.name,'root');assert.equal(ast.ports[0].direction,'input');assert.equal(ast.assignments[0].expression.kind,'UnaryExpression');assert.equal(ast.assignments[0].expression.argument.name,'pin1');assert.equal(ast.assignments[0].span.line,3);
 assert.deepEqual(synthesize(ast).transistors,[{id:'P1',type:'P',source:'VCC',drain:'pin8',gate:'pin1'}]);
});
test('DIP numbering excludes power pads and reverses right side',()=>{
 assert.deepEqual(Array.from({length:8},(_,i)=>pinPoint(i+1)),[[2,7],[2,11],[2,15],[2,19],[41,19],[41,15],[41,11],[41,7]]);
});
test('unsupported syntax and semantic errors fail explicitly',()=>{
 const invalid=[source().replace('~pin1','~~pin1'),source().replace('~pin1','~pin2'),source().replace('output pin8','input pin8'),source().replace('pin8','pin9'),source().replace('root','other'),source().replace('input pin1','input [3:0] pin1'),source().replace('endmodule','assign pin8 = ~pin1; endmodule'),source()+' garbage',source().replace('input pin1','pin1 input'),source()+' /*',source().replace('output pin8','output pin8, pin7'),source().replace('output pin8','output pin8, pin8')];
 for(const code of invalid)assert.throws(()=>synthesize(parse(code)),Diagnostic,code);
});
test('all 56 pin directions route and simulate as an inverter in the original game engine',async()=>{
 for(let a=1;a<=8;a++)for(let b=1;b<=8;b++)if(a!==b){
  const layout=route(synthesize(parse(source(a,b)))),board=decode(encode(layout.board));board.mainCanvasLock=true;
  assert.equal(board.ScoreDesign(),layout.area);assert.equal(score(layout.board),layout.area);
  const index=n=>n<=4?n-1:12-n;
  const blocks=[1,0,1,0,1,0];
  const pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:i===index(b),blocks:i===index(a)?blocks:Array(6).fill(0)}));
  const sim=new Simulation(board,{id:'INVERTER',length:60,pins});sim.run();
  for(let tick=1;tick<60;tick++)assert.equal(sim.signals[index(b)].values[tick],!sim.signals[index(a)].pattern[tick-1],`pin${a}->pin${b}, tick ${tick}`);
  const restored=await importLegacy(await exportLegacy(layout.board));assert.equal(gameEncode(restored),gameEncode(board));
 }
});
function multiSource(pairs){const inputs=[...new Set(pairs.map(p=>p[0]))],outputs=pairs.map(p=>p[1]);return `module root(input ${inputs.map(n=>'pin'+n).join(',')}, output ${outputs.map(n=>'pin'+n).join(',')}); ${pairs.map(([a,b])=>`assign pin${b} = ~pin${a};`).join('\n')} endmodule`;}
test('multiple assigns: four independent inverters and shared inputs up to seven outputs',async()=>{
 const cases=[[[1,8],[2,7],[3,6],[4,5]],[[1,5],[2,6],[3,7],[4,8]],[[8,1],[7,2],[6,3],[5,4]],[[1,8],[1,7],[2,6],[2,5]]];
 for(let a=1;a<=8;a++)cases.push(Array.from({length:8},(_,i)=>i+1).filter(b=>b!==a).map(b=>[a,b]));
 for(const pairs of cases){
  const netlist=synthesize(parse(multiSource(pairs)));assert.equal(netlist.transistors.length,pairs.length);
  const layout=route(netlist),board=decode(encode(layout.board));board.mainCanvasLock=true;assert.equal(layout.transistors.length,pairs.length);assert.equal(board.ScoreDesign(),layout.area);
  assert.equal(board.gateHorizontal.flat().filter(Boolean).length+board.gateVertical.flat().filter(Boolean).length,pairs.length);
  const index=n=>n<=4?n-1:12-n,pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:pairs.some(([,b])=>index(b)===i),blocks:Array.from({length:16},(_,step)=>(step>>((i%4)))&1)}));
  const sim=new Simulation(board,{id:'MULTI',length:160,pins});sim.run();
  for(const[a,b]of pairs)for(let tick=1;tick<160;tick++)assert.equal(sim.signals[index(b)].values[tick],!sim.signals[index(a)].pattern[tick-1],`${JSON.stringify(pairs)}, tick ${tick}`);
  const restored=await importLegacy(await exportLegacy(layout.board));assert.equal(gameEncode(restored),gameEncode(board));
 }
});
test('four-inverter module solves the original first level',async()=>{
 const {levels}=await import('../../game/levels.js');const board=decode(encode(route(synthesize(parse(multiSource([[1,8],[2,7],[3,6],[4,5]])))).board));board.mainCanvasLock=true;assert.equal(new Simulation(board,levels[0]).run(),100);
});
test('comma-separated assigns normalize to the same netlist and topology',()=>{
 const head='module root(input pin1, pin2, pin3, pin4, output pin8, pin7, pin6, pin5);\n';
 const grouped=head+'assign pin8=~pin1;\nassign pin7=~pin2, /* next */ pin6=~(pin3),\n  pin5=~pin4; endmodule';
 const separate=multiSource([[1,8],[2,7],[3,6],[4,5]]);
 const ast=parse(grouped);assert.equal(ast.assignments.length,4);assert.equal(ast.assignments[3].span.line,4);assert.equal(ast.assignments[3].span.column,3);
 assert.deepEqual(synthesize(ast),synthesize(parse(separate)));
 assert.deepEqual(route(synthesize(ast)).board,route(synthesize(parse(separate))).board);
 const user='module root(input pin3,pin4,output pin6,pin5); assign pin6=~pin3, pin5=~pin4; endmodule';assert.equal(synthesize(parse(user)).transistors.length,2);
});
test('comma-list syntax errors and duplicate drivers retain useful locations',()=>{
 const head='module root(input pin3,pin4,output pin6,pin5);\n';
 for(const body of ['assign ,pin6=~pin3;','assign pin6=~pin3,;','assign pin6=~pin3,,pin5=~pin4;','assign pin6=~pin3, pin5;','assign pin6=~pin3, assign pin5=~pin4;','assign pin6=~pin3, pin5=~pin4'])assert.throws(()=>parse(head+body+' endmodule'),Diagnostic);
 assert.throws(()=>synthesize(parse(head+'assign pin6=~pin3,\n pin6=~pin4; endmodule')),error=>error instanceof Diagnostic&&error.span.line===3&&/Повторное назначение/.test(error.message));
 assert.throws(()=>synthesize(parse(head+'assign pin6=~pin3,\n pin5=~pin2; endmodule')),error=>error instanceof Diagnostic&&error.span.line===3&&/pin2/.test(error.message));
});
test('concatenation AST preserves order, nesting and bitwise NOT semantics',async()=>{
 const head='module root(input pin1,pin2,pin3,pin4, output pin8,pin7,pin6,pin5);\n';
 const body='assign {pin8, pin7, pin6, pin5} = ~{pin1, pin2, pin3, pin4};';
 const ast=parse(head+body+' endmodule');
 assert.equal(ast.assignments.length,1);assert.equal(ast.assignments[0].target.kind,'Concatenation');
 assert.deepEqual(ast.assignments[0].target.elements.map(n=>n.name),['pin8','pin7','pin6','pin5']);
 assert.equal(ast.assignments[0].expression.argument.kind,'Concatenation');
 const expected=synthesize(parse(multiSource([[1,8],[2,7],[3,6],[4,5]])));
 for(const code of [body,'assign {{pin8,pin7},{pin6,pin5}} = ~({pin1,{pin2,pin3},pin4});','assign {pin8,pin7}=~{pin1,pin2}, {pin6,pin5}=~{pin3,pin4};'])assert.deepEqual(synthesize(parse(head+code+' endmodule')),expected);
 const layout=route(synthesize(ast));assert.deepEqual(layout.board,route(expected).board);
 const {levels}=await import('../../game/levels.js');const board=decode(encode(layout.board));board.mainCanvasLock=true;assert.equal(new Simulation(board,levels[0]).run(),100);
 const reverse=synthesize(parse(head+'assign {pin5,pin6,pin7,pin8}=~{pin1,pin2,pin3,pin4}; endmodule'));
 assert.deepEqual(reverse.transistors.map(t=>[t.gate,t.drain]),[['pin1','pin5'],['pin2','pin6'],['pin3','pin7'],['pin4','pin8']]);
});
test('concatenation errors: widths, syntax, duplicate drivers and directions',()=>{
 const head='module root(input pin1,pin2,output pin8,pin7);\n';
 for(const body of ['assign {}=~{pin1,pin2};','assign {pin8,}=~{pin1,pin2};','assign {pin8,pin7}=~{};','assign {pin8,pin7}=~{pin1,};','assign {~pin8,pin7}=~{pin1,pin2};'])assert.throws(()=>parse(head+body+' endmodule'),Diagnostic);
 for(const body of ['assign {pin8,pin7}=~pin1;','assign pin8=~{pin1,pin2};'])assert.throws(()=>synthesize(parse(head+body+' endmodule')),e=>e instanceof Diagnostic&&/Ширины/.test(e.message));
 for(const body of ['assign {pin8,pin8}=~{pin1,pin2};','assign {pin8,pin7}=~{pin1,pin8};','assign {pin8,pin1}=~{pin1,pin2};','assign {pin8,pin7}=~{pin1,~pin2};'])assert.throws(()=>synthesize(parse(head+body+' endmodule')),Diagnostic);
 const repeated=synthesize(parse(head+'assign {pin8,pin7}=~{pin1,pin1}; endmodule'));assert.deepEqual(repeated.transistors.map(t=>t.gate),['pin1','pin1']);
});
test('AND AST precedence and netlist series permutation metadata',()=>{
 const ast=parse('module root(input pin1,pin2,pin3,output pin8); assign pin8=pin1 & (pin2 & pin3); endmodule');
 assert.equal(ast.assignments[0].expression.kind,'BinaryExpression');
 const net=synthesize(ast);assert.equal(net.transistors.length,3);assert(net.transistors.every(t=>t.type==='N'));
 assert.equal(net.transistors[0].source,'VCC');assert.equal(net.transistors[2].drain,'pin8');
 assert.equal(net.transistors[0].drain,net.transistors[1].source);assert.equal(net.transistors[1].drain,net.transistors[2].source);
 assert.deepEqual(net.transistors.map(t=>t.gate),['pin1','pin2','pin3']);
 assert.deepEqual(net.seriesGroups,[{id:'and1',transistors:['N1','N2','N3'],permutable:true}]);
 const precedence=parse('module root(input pin1,pin2,output pin8); assign pin8=~pin1 & pin2; endmodule').assignments[0].expression;
 assert.equal(precedence.kind,'BinaryExpression');assert.equal(precedence.left.kind,'UnaryExpression');assert.equal(precedence.right.name,'pin2');
});
test('AND routing, mixed P/N controls, fan-out, concatenation and chained AND match the game per tick',async()=>{
 const head='module root(input pin1,pin2,pin3,pin4,output pin8,pin7,pin6,pin5);';
 const cases=[
  {code:head+'assign {pin8,pin7,pin6,pin5}={pin1,pin2,pin3,pin4}&{pin2,pin3,pin4,pin1}; endmodule', expected:[[8,[1,2]],[7,[2,3]],[6,[3,4]],[5,[4,1]]]},
  {code:head+'assign pin8=pin1&pin2, pin7=~pin1, pin6=pin1&pin1, pin5=~pin2; endmodule',expected:[[8,[1,2]],[7,[1],true],[6,[1,1]],[5,[2],true]]},
  {code:head+'assign pin8=pin1&pin2&pin3&pin4, pin7=~pin1, pin6=~pin2, pin5=~pin3; endmodule',expected:[[8,[1,2,3,4]],[7,[1],true],[6,[2],true],[5,[3],true]]}
 ];
 for(let output=1;output<=8;output++){
  const a=output%8+1,b=(output+1)%8+1;
  cases.push({code:`module root(input pin${a},pin${b},output pin${output}); assign pin${output}=pin${a}&pin${b}; endmodule`,expected:[[output,[a,b]]]});
 }
 for(const {code,expected}of cases){
  const net=synthesize(parse(code)),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
  assert.equal(board.gateHorizontal.flat().filter(Boolean).length+board.gateVertical.flat().filter(Boolean).length,net.transistors.length);
  assert.equal(board.ScoreDesign(),layout.area);
  const index=n=>n<=4?n-1:12-n,pins=Array.from({length:8},(_,i)=>({name:`P${i}`,output:expected.some(([out])=>index(out)===i),blocks:Array.from({length:16},(_,t)=>(t>>(i%4))&1)}));
  const sim=new Simulation(board,{id:'AND',length:160,pins});sim.run();
  for(const [out,inputs,invert]of expected)for(let t=1;t<160;t++){
   const value=inputs.every(n=>sim.signals[index(n)].pattern[t-1]);assert.equal(sim.signals[index(out)].values[t],invert?!value:value,`${code}, tick ${t}, pin${out}`);
  }
  const restored=await importLegacy(await exportLegacy(layout.board));assert.equal(gameEncode(restored),gameEncode(board));
 }
});
test('two AND gates solve level 2 and preserve both input orders',async()=>{
 const {levels}=await import('../../game/levels.js');
 for(const rhs of ['pin1&pin2','pin2&pin1']){
  const net=synthesize(parse(`module root(input pin1,pin2,pin7,pin6,output pin3,pin5); assign pin3=${rhs},pin5=pin7&pin6; endmodule`));
  assert.equal(net.transistors.length,4);assert.equal(net.seriesGroups.length,2);
  const board=decode(encode(route(net).board));board.mainCanvasLock=true;assert.equal(new Simulation(board,levels[1]).run(),100);
 }
});
test('AND rejects unsupported mixed expressions and implicit width conversion',()=>{
 const head='module root(input pin1,pin2,output pin8,pin7);';
 for(const body of ['assign {pin8,pin7}={pin1,pin2}&pin1;','assign pin8=~(pin1&pin2),pin7=~pin1;','assign pin8=pin1&&pin2,pin7=~pin1;','assign pin8=pin1&,pin7=~pin1;'])assert.throws(()=>synthesize(parse(head+body+' endmodule')),Diagnostic);
});

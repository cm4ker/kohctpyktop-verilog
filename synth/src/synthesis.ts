import {optimizeNets,recognizeCells} from './optimization.ts';
import {elaborateTransistor} from './library/transistor.ts';
import {elaborateRsTrigger} from './library/rs-trigger.ts';
import type {RsTrigger} from './library/rs-trigger.ts';
import {flattenModules} from './hierarchy.ts';
import {elaborateDelayLine} from './library/delay-line.ts';
import type {DelayLine} from './library/delay-line.ts';
import {elaboratePor} from './library/por.ts';
import type {PorChain} from './library/por.ts';
import { Diagnostic } from './parser.ts';
import type { Module, Expression, Identifier, Span } from './parser.ts';
export type Point = readonly [number, number];
export interface Binding { name: string; number: number; direction: 'input' | 'output'; point: Point; net?: string }
export interface Transistor { id: string; type: 'P' | 'N'; source: string; drain: string; gate: string }
export interface SeriesGroup { id: string; transistors: string[]; permutable: true }
export interface ParallelGroup { id: string; transistors: string[]; source: string; drain: string }
export interface Netlist { module: string; bindings: Binding[]; transistors: Transistor[]; seriesGroups: SeriesGroup[]; parallelGroups: ParallelGroup[]; porChains: PorChain[]; delayLines: DelayLine[]; rsTriggers:RsTrigger[]; wires: {name:string;msb:number;lsb:number;width:number}[] }
export function pinPoint(number: number): Point {
  if (!Number.isInteger(number) || number < 1 || number > 8) throw Error('Номер контакта должен быть от 1 до 8.');
  return number <= 4 ? [2, 7 + (number - 1) * 4] : [41, 7 + (8 - number) * 4];
}
type Bit = {kind:'xor';left:Bit;right:Bit;span:Span} | {kind:'constant';value:boolean;span:Span} | {kind:'input';name:string;span:Span} | {kind:'not';argument:Bit;span:Span} | {kind:'and'|'or';operands:Bit[];span:Span};
function combine(kind:'and'|'or',operands:Bit[],span:Span):Bit {
  const flat=operands.flatMap(bit=>bit.kind===kind?bit.operands:[bit]);
  const absorbing=kind==='or';
  if(flat.some(b=>b.kind==='constant'&&b.value===absorbing))return {kind:'constant',value:absorbing,span};
  const rest=flat.filter(b=>b.kind!=='constant');
  if(!rest.length)return {kind:'constant',value:!absorbing,span};
  if(rest.length===1)return rest[0];
  return {kind,operands:rest,span};
}
function negate(bit:Bit,span:Span):Bit {
  if(bit.kind==='constant')return {...bit,value:!bit.value};
  if(bit.kind==='xor')return {...bit,right:negate(bit.right,span)};
  if(bit.kind==='not')return bit.argument;
  if(bit.kind==='input')return {kind:'not',argument:bit,span};
  return combine(bit.kind==='and'?'or':'and',bit.operands.map(b=>negate(b,span)),span);
}
function targets(expression:Expression):Identifier[]{
  if(expression.kind==='Identifier')return [expression];
  if(expression.kind==='Concatenation')return expression.elements.flatMap(targets);
  throw new Diagnostic('Слева ожидается имя выхода или конкатенация выходов.',expression.span);
}
export function synthesize(ast: Module,options:{optimize?:boolean}={}): Netlist {
  ast=flattenModules(ast);
  if (ast.name !== 'root') throw new Diagnostic('Верхний модуль должен называться root.', ast.span);
  const seen = new Set<string>();
  const bindings:Binding[] = ast.ports.map(port => {
    if (!/^pin[1-8]$/.test(port.name)) throw new Diagnostic('Имя порта должно быть pin1 … pin8.', port.span);
    if (seen.has(port.name)) throw new Diagnostic(`Повторное объявление ${port.name}.`, port.span); seen.add(port.name);
    const number = Number(port.name.slice(3)); return {name:port.name, number, direction:port.direction, point:pinPoint(number)};
  });
  const declarations=new Map(ast.wires.map(w=>[w.name,w])),drivers=new Map<string,Expression>();
  for(const wire of ast.wires){
    if(seen.has(wire.name))throw new Diagnostic(`Повторное объявление ${wire.name}.`,wire.span);seen.add(wire.name);
    if(Math.abs(wire.msb-wire.lsb)+1>64)throw new Diagnostic('Пока поддерживаются wire шириной до 64 бит.',wire.span);
    if(wire.initializer)drivers.set(wire.name,wire.initializer);
  }
  const outputAssignments=ast.assignments.filter(assignment=>{
    if(assignment.target.kind!=='Identifier'||!declarations.has(assignment.target.name))return true;
    const name=assignment.target.name;if(drivers.has(name))throw new Diagnostic(`Повторное назначение wire ${name}.`,assignment.span);
    drivers.set(name,assignment.expression);return false;
  });
  const transistorNets=new Set<string>();
  const moduleNets=new Set<string>(),modulePins=new Set<string>(),porChains:PorChain[]=[],porTransistors:Transistor[]=[];
  const rsTriggers:RsTrigger[]=[];
  const delayLines:DelayLine[]=[],delayInputs:Identifier[]=[];
  const aliases=new Map<string,string>();
  for(const instance of ast.instances){
    if(seen.has(instance.name))throw new Diagnostic('Повторное имя экземпляра: '+instance.name,instance.span);seen.add(instance.name);
    const delayed=instance.module==='delay_line'?elaborateDelayLine(instance):undefined;
    const triggered=instance.module==='rs_trigger'?elaborateRsTrigger(instance):undefined;
    const primitive=['transistor_n','transistor_p'].includes(instance.module)?elaborateTransistor(instance):undefined;
    const expanded=primitive??triggered??delayed??elaboratePor(instance);
    for(const connection of expanded.connections){
    const name=connection.signal,wire=declarations.get(name);
    if(!wire&&!bindings.some(b=>b.name===name&&b.direction==='output'))throw new Diagnostic('Выход POR подключается к выходному порту или скалярному wire: '+name,instance.span);
    if(wire&&wire.msb!==wire.lsb)throw new Diagnostic('Выход POR подключается к скалярному wire.',wire.span);
    if((moduleNets.has(name)&&!(primitive&&transistorNets.has(name)))||drivers.has(name))throw new Diagnostic('Повторное назначение '+name,instance.span);
    moduleNets.add(name);if(primitive)transistorNets.add(name);if(!wire)modulePins.add(name);
    if(name!==connection.net)aliases.set(name,connection.net);
    }
    if(primitive)delayInputs.push(...primitive.inputs);
    else if(triggered){rsTriggers.push(triggered.latch);delayInputs.push(...triggered.inputs);}
    else if(delayed){delayLines.push(delayed.chain);delayInputs.push(delayed.input);}
    else if('chain' in expanded)porChains.push(expanded.chain);
    porTransistors.push(...expanded.transistors);
  }
  const root=(name:string):string=>aliases.has(name)?root(aliases.get(name)!):name;
  const cache=new Map<string,Bit[]>(),visiting=new Set<string>();
  const widthError=(a:number,b:number,span:Span):never=>{throw new Diagnostic(`Ширины не совпадают: ${a} и ${b}. Автоматическое расширение и усечение пока не поддерживаются.`,span);};
  function wireBits(name:string):Bit[]{
    if(cache.has(name))return cache.get(name)!;
    const decl=declarations.get(name)!;
    if(moduleNets.has(name))return [{kind:'input',name,span:decl.span}];
    if(visiting.has(name))throw new Diagnostic(`Циклическое определение wire ${name}.`,decl.span);
    const driver=drivers.get(name);if(!driver)throw new Diagnostic(`У wire ${name} нет назначения.`,decl.span);
    visiting.add(name);const result=resolve(driver);visiting.delete(name);
    const width=Math.abs(decl.msb-decl.lsb)+1;if(result.length!==width)widthError(width,result.length,decl.span);
    cache.set(name,result);return result;
  }
  function resolve(expr:Expression):Bit[]{
    switch(expr.kind){
      case 'NumberLiteral':return [...expr.bits].map(b=>({kind:'constant',value:b==='1',span:expr.span}));
      case 'Identifier':{
        if(declarations.has(expr.name))return wireBits(expr.name);
        if(!moduleNets.has(expr.name)&&!bindings.some(b=>b.name===expr.name&&b.direction==='input'))throw new Diagnostic(`${expr.name} должен быть объявлен как input или wire.`,expr.span);
        return [{kind:'input',name:expr.name,span:expr.span}];
      }
      case 'Concatenation':return expr.elements.flatMap(resolve);
      case 'DynamicSelection':{
        const data=resolve(expr.argument),selector=resolve(expr.index);
        const decl=declarations.get(expr.argument.name),msb=decl?.msb??0,lsb=decl?.lsb??0;
        // Decode each legal numeric index; unreachable/out-of-range branches are absent.
        const branches:Bit[]=[];
        for(let offset=0;offset<data.length;offset++){
          const index=BigInt(msb+(msb<=lsb?offset:-offset));
          if(index>=(1n<<BigInt(selector.length)))continue;
          const decoded=selector.map((bit,i)=>(index&(1n<<BigInt(selector.length-1-i)))!==0n?bit:negate(bit,expr.span));
          branches.push(combine('and',[data[offset],...decoded],expr.span));
        }
        if(!branches.length)throw new Diagnostic('Selector cannot address any bit of this bus.',expr.span);
        return [combine('or',branches,expr.span)];
      }
      case 'Selection':{
        const value=resolve(expr.argument),decl=declarations.get(expr.argument.name),msb=decl?.msb??0,lsb=decl?.lsb??0;
        const low=Math.min(msb,lsb),high=Math.max(msb,lsb);
        if(expr.msb<low||expr.msb>high||expr.lsb<low||expr.lsb>high)throw new Diagnostic('Индекс выходит за границы шины.',expr.span);
        if(expr.msb!==expr.lsb&&Math.sign(expr.msb-expr.lsb)!==Math.sign(msb-lsb))throw new Diagnostic('Направление среза должно совпадать с объявлением шины.',expr.span);
        const step=expr.msb<=expr.lsb?1:-1;
        return Array.from({length:Math.abs(expr.msb-expr.lsb)+1},(_,i)=>value[Math.abs(msb-(expr.msb+i*step))]);
      }
      case 'UnaryExpression':{
        const operand=resolve(expr.argument);
        if(expr.operator==='~')return operand.map(bit=>bit.kind==='constant'?negate(bit,expr.span):({kind:'not',argument:bit,span:expr.span}));
        return [combine(expr.operator==='&'?'and':'or',operand,expr.span)];
      }
      case 'BinaryExpression':{
        const left=resolve(expr.left),right=resolve(expr.right);
        if(expr.operator==='||')return [combine('or',[...left,...right],expr.span)];
        if(expr.operator==='<<'){
          // Left operand width is preserved; bits shifted out are discarded.
          return left.map((_,output)=>{
            const branches:Bit[]=[];
            for(let shift=0;output+shift<left.length&&BigInt(shift)<(1n<<BigInt(right.length));shift++){
              const decoded=right.map((bit,i)=>(BigInt(shift)&(1n<<BigInt(right.length-1-i)))!==0n?bit:negate(bit,expr.span));
              branches.push(combine('and',[left[output+shift],...decoded],expr.span));
            }
            return combine('or',branches,expr.span);
          });
        }
        if(left.length!==right.length)widthError(left.length,right.length,expr.span);
        if(expr.operator==='^')return left.map((bit,i)=>{
          const other=right[i];
          if(bit.kind==='constant')return bit.value?negate(other,expr.span):other;
          if(other.kind==='constant')return other.value?negate(bit,expr.span):bit;
          if(options.optimize)return {kind:'xor',left:bit,right:other,span:expr.span};
          return combine('or',[
            combine('and',[bit,negate(other,expr.span)],expr.span),
            combine('and',[negate(bit,expr.span),other],expr.span)
          ],expr.span);
        });
        return left.map((bit,i)=>combine(expr.operator==='&'?'and':'or',[bit,right[i]],expr.span));
      }
    }
  }
  for(const wire of ast.wires)wireBits(wire.name);
  const driven = new Set<string>(modulePins), transistors: Transistor[] = [...porTransistors], seriesGroups: SeriesGroup[] = [],parallelGroups:ParallelGroup[]=[];
  let internal=0;
  const logicNets=new Map<Bit,string>();
  function signal(bit:Bit):string {
    if(bit.kind==='input')return bit.name;
    if(bit.kind==='constant'&&bit.value)return 'VCC';
    if(logicNets.has(bit))return logicNets.get(bit)!;
    const name=`$logic${++internal}`;logicNets.set(bit,name);emit(bit,'VCC',name);return name;
  }
  function emit(bit:Bit,source:string,drain:string):void {
    if(bit.kind==='xor'){
      const a=signal(bit.left),b=signal(bit.right),on=`$xor${++internal}`,off=`$xor${++internal}`;
      for(const [type,s,g,d]of [['N',source,a,on],['P',source,a,off],['N',off,b,drain],['P',on,b,drain]] as const)transistors.push({id:`${type}${transistors.length+1}`,type,source:s,gate:g,drain:d});
      return;
    }

    if(bit.kind==='constant'){if(bit.value&&drain!==source)aliases.set(drain,source);return;}
    if(bit.kind==='input'||bit.kind==='not'){
      if(bit.kind==='not'&&bit.argument.kind!=='input')throw new Diagnostic('Пока инвертируются только входные биты, а не результат логической операции.',bit.span);
      const type=bit.kind==='not'?'P':'N',gate=bit.kind==='input'?bit.name:(bit.argument as Extract<Bit,{kind:'input'}>).name;
      transistors.push({id:`${type}${transistors.length+1}`,type,source,drain,gate});return;
    }
    const start=transistors.length;
    if(bit.kind==='and'){
      let previous=source;
      bit.operands.forEach((operand,i)=>{const next=i===bit.operands.length-1?drain:`$series${++internal}`;emit(operand,previous,next);previous=next;});
      if(bit.operands.every(b=>b.kind==='input'||b.kind==='not'))seriesGroups.push({id:`and${seriesGroups.length+1}`,transistors:transistors.slice(start).map(t=>t.id),permutable:true});
    }else{
      for(const operand of bit.operands)emit(operand,source,drain);
      if(bit.operands.every(b=>b.kind==='input'||b.kind==='not'))parallelGroups.push({id:`or${parallelGroups.length+1}`,transistors:transistors.slice(start).map(t=>t.id),source,drain});
    }
  }
  const materializedInputs=new Set<string>();
  for(const input of delayInputs){
    if(materializedInputs.has(input.name))continue;materializedInputs.add(input.name);
    const values=resolve(input);if(values.length!==1)widthError(1,values.length,input.span);
    const value=values[0];
    if(value.kind==='input'){if(input.name!==value.name)aliases.set(input.name,value.name);}
    else emit(value,'VCC',input.name);
  }
  for(const assignment of outputAssignments){
    const outputs=targets(assignment.target),values=resolve(assignment.expression);
    if(outputs.length!==values.length)widthError(outputs.length,values.length,assignment.span);
    outputs.forEach((output,i)=>{
      if(!bindings.some(b=>b.name===output.name&&b.direction==='output'))throw new Diagnostic(`${output.name} должен быть объявлен как output.`,output.span);
      if(driven.has(output.name))throw new Diagnostic(`Повторное назначение выхода ${output.name}.`,output.span);driven.add(output.name);
      if(values[i].kind==='input'&&moduleNets.has(values[i].name)){const source=root(values[i].name);if(source==='VCC')aliases.set(output.name,'VCC');else aliases.set(source,output.name);return;}
      if(values[i].kind==='input'){if(output.name!==values[i].name)aliases.set(output.name,values[i].name);return;}
      emit(values[i],'VCC',output.name);
    });
  }
  if(!outputAssignments.length&&!ast.instances.length)throw new Diagnostic('Добавьте assign для выхода.',ast.span);
  for(const port of ast.ports)if(port.direction==='output'&&!driven.has(port.name))throw new Diagnostic(`Выход ${port.name} не имеет assign.`,port.span);
  for(const b of bindings)if(root(b.name)!==b.name)b.net=root(b.name);
  for(const t of transistors){t.source=root(t.source);t.drain=root(t.drain);t.gate=root(t.gate);}
  for(const c of rsTriggers){c.r=root(c.r);c.s=root(c.s);c.output=root(c.output);}
  for(const c of delayLines){c.output=root(c.output);c.input=root(c.input);}
  for(const c of porChains){c.output=root(c.output);if(c.preOutput)c.preOutput=root(c.preOutput);}
  for(const g of parallelGroups){g.source=root(g.source);g.drain=root(g.drain);}
  const net:Netlist={module:ast.name,bindings,transistors,seriesGroups,parallelGroups,porChains,delayLines,rsTriggers,wires:ast.wires.map(w=>({name:w.name,msb:w.msb,lsb:w.lsb,width:Math.abs(w.msb-w.lsb)+1}))};
  if(options.optimize)optimizeNets(net);
  recognizeCells(net);
  return net;
}

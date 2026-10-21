import {Diagnostic} from './parser.ts';
import type {IntegerExpression,Module,ModuleBody,Span} from './parser.ts';
export function integerValue(e:IntegerExpression,values:Map<string,number>,span:Span):number {
 if(e.kind==='integer')return e.value;
 if(e.kind==='parameter'){const value=values.get(e.name);if(value===undefined)throw new Diagnostic('Unknown parameter: '+e.name,span);return value;}
 const a=integerValue(e.left,values,span),b=integerValue(e.right,values,span);return e.operator==='+'?a+b:a-b;
}
export function specializeModule(mod:Module,overrides:Map<string,number>):Module {
 const values=new Map<string,number>();
 for(const p of mod.parameters??[]){if(values.has(p.name))throw new Diagnostic('Duplicate parameter: '+p.name,p.span);values.set(p.name,overrides.get(p.name)??p.value);}
 for(const name of overrides.keys())if(!values.has(name))throw new Diagnostic('Unknown parameter: '+name,mod.span);
 for(const value of values.values())if(!Number.isSafeInteger(value)||value<1||value>64)throw new Diagnostic('Parameters must be integers in 1..64.',mod.span);
 function flatten(body:ModuleBody):ModuleBody {
  const result:ModuleBody={wires:[...body.wires],assignments:[...body.assignments],instances:body.instances.map(i=>({...i,parameters:i.parameters.map(p=>({...p,value:p.expression?integerValue(p.expression,values,p.span):p.value,expression:undefined}))})),generates:[]};
  for(const g of body.generates){const child=flatten(integerValue(g.left,values,g.span)===integerValue(g.right,values,g.span)?g.yes:g.no);result.wires.push(...child.wires);result.assignments.push(...child.assignments);result.instances.push(...child.instances);}
  return result;
 }
 return {...mod,...flatten({...mod,generates:mod.generates??[]}),parameters:[]};
}

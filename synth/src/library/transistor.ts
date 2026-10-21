import {Diagnostic} from '../parser.ts';
import type {Identifier,Instance} from '../parser.ts';
import type {Transistor} from '../synthesis.ts';
/** Explicit devices remain devices, including parallel drains and feedback. */
export function elaborateTransistor(instance:Instance){
  if(instance.parameters.length)throw new Diagnostic('Transistors have no parameters.',instance.span);
  const ports=new Map<string,Identifier>();
  for(const c of instance.connections){
    if(!['s','g','d'].includes(c.name))throw new Diagnostic('Transistor ports are s, g, d.',c.span);
    if(ports.has(c.name))throw new Diagnostic(`Duplicate port: ${c.name}.`,c.span);
    if(c.signal.kind!=='Identifier')throw new Diagnostic('Expected elaborated scalar signal.',c.span);
    ports.set(c.name,c.signal);
  }
  for(const name of ['s','g','d'])if(!ports.has(name))throw new Diagnostic(`Missing transistor port: ${name}.`,instance.span);
  const s=ports.get('s')!,g=ports.get('g')!,d=ports.get('d')!;
  const transistor:Transistor={id:instance.name,type:instance.module==='transistor_n'?'N':'P',source:s.name,gate:g.name,drain:d.name};
  return {transistors:[transistor],connections:[{signal:d.name,net:d.name}],inputs:[s,g]};
}

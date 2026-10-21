import {Diagnostic} from '../parser.ts';
import type {Identifier,Instance} from '../parser.ts';

export interface RsTrigger {
  instance:string;
  r:string;
  s:string;
  output:string;
  transistors:string[];
}

/** Named scalar interface shared by the latch elaborator and its diagnostics. */
export function rsTriggerPorts(instance:Instance):{r:Identifier;s:Identifier;out:Identifier} {
  if(instance.parameters.length)throw new Diagnostic('rs_trigger has no parameters.',instance.parameters[0].span);
  const ports=new Map<string,Identifier>();
  for(const connection of instance.connections){
    if(!['r','s','out'].includes(connection.name))throw new Diagnostic('rs_trigger ports are r, s and out.',connection.span);
    if(ports.has(connection.name))throw new Diagnostic(`Duplicate port: ${connection.name}.`,connection.span);
    if(connection.signal.kind!=='Identifier')throw new Diagnostic('Expected elaborated scalar connection.',connection.span);
    ports.set(connection.name,connection.signal);
  }
  for(const name of ['r','s','out'])if(!ports.has(name))throw new Diagnostic(`Missing rs_trigger port: ${name}.`,instance.span);
  return {r:ports.get('r')!,s:ports.get('s')!,out:ports.get('out')!};
}

export function elaborateRsTrigger(instance:Instance){
  const ports=rsTriggerPorts(instance),output=ports.out.name;
  const setNode=`$rs.${instance.name}.set`,holdNode=`$rs.${instance.name}.hold`;
  const transistors:import('../synthesis.ts').Transistor[]=[
    {id:instance.name+'.setN',type:'N',source:'VCC',gate:ports.s.name,drain:setNode},
    {id:instance.name+'.holdN',type:'N',source:'VCC',gate:output,drain:holdNode},
    {id:instance.name+'.setP',type:'P',source:setNode,gate:ports.r.name,drain:output},
    {id:instance.name+'.holdP',type:'P',source:holdNode,gate:ports.r.name,drain:output}
  ];
  const latch:RsTrigger={instance:instance.name,r:ports.r.name,s:ports.s.name,output,transistors:transistors.map(t=>t.id)};
  return {latch,transistors,connections:[{signal:output,net:output}],inputs:[ports.r,ports.s]};
}

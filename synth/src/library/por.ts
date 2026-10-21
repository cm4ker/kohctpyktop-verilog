import {Diagnostic} from '../parser.ts';
import type {Instance} from '../parser.ts';
import type {Transistor} from '../synthesis.ts';
export interface PorChain { instance:string; depth:number; transistors:string[]; output:string; preOutput?:string; permutable:false }
/** Each N gate is tied to its source; VCC feeds only stage zero. */
export function elaboratePor(instance:Instance):{chain:PorChain;transistors:Transistor[];connections:{signal:string;net:string}[]} {
  if(instance.module!=='por')throw new Diagnostic(`Неизвестный подмодуль ${instance.module}. В библиотеке есть por и delay_line.`,instance.span);
  let depth=10;const parameters=new Set<string>();
  for(const parameter of instance.parameters){
    if(parameter.name!=='DEPTH')throw new Diagnostic('У por есть только параметр DEPTH.',parameter.span);
    if(parameters.has(parameter.name))throw new Diagnostic('Повторный параметр DEPTH.',parameter.span);parameters.add(parameter.name);depth=parameter.value;
  }
  if(!Number.isInteger(depth)||depth<1||depth>64)throw new Diagnostic('DEPTH должен быть целым числом от 1 до 64.',instance.span);
  const ports=new Map<string,string>();
  for(const connection of instance.connections){
    if(connection.signal.kind!=='Identifier')throw new Diagnostic('Output requires a signal.',connection.span);
    if(!['out','pre_out'].includes(connection.name))throw new Diagnostic('У por есть выходы out и pre_out.',connection.span);
    if(ports.has(connection.name))throw new Diagnostic(`Повторное подключение ${connection.name}.`,connection.span);
    if([...ports.values()].includes(connection.signal.name))throw new Diagnostic('out и pre_out должны подключаться к разным сигналам.',connection.span);
    ports.set(connection.name,connection.signal.name);
  }
  if(!ports.has('out'))throw new Diagnostic('Подключите выход por: .out(pinN) или .out(имя_wire).',instance.span);
  const output=ports.get('out')!,pre=ports.get('pre_out'),preOutput=pre?(depth===1?'VCC':pre):undefined;
  const connections=[{signal:output,net:output}];if(pre)connections.push({signal:pre,net:preOutput!});
  const transistors:Transistor[]=[];let previous='VCC';
  for(let i=0;i<depth;i++){
    const drain=i===depth-1?output:i===depth-2&&preOutput?preOutput:`$por.${instance.name}.${i+1}`;
    transistors.push({id:`${instance.name}.N${i+1}`,type:'N',source:previous,gate:previous,drain});previous=drain;
  }
  return {chain:{instance:instance.name,depth,transistors:transistors.map(t=>t.id),output,...(preOutput?{preOutput}:{}),permutable:false},transistors,connections};
}

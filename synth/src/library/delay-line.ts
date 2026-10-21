import {Diagnostic} from '../parser.ts';
import type {Instance} from '../parser.ts';
import {elaboratePor} from './por.ts';
import type {PorChain} from './por.ts';
export interface DelayLine extends PorChain { input:string }
/** Same source-tied N chain as POR, driven by a signal rather than VCC. */
export function elaborateDelayLine(instance:Instance){
  const ports=new Map<string,Instance['connections'][number]>();
  for(const port of instance.connections){
    if(!['in','out'].includes(port.name))throw new Diagnostic('У delay_line есть только порты in и out.',port.span);
    if(ports.has(port.name))throw new Diagnostic(`Повторное подключение ${port.name}.`,port.span);ports.set(port.name,port);
  }
  const input=ports.get('in'),output=ports.get('out');
  if(!input||!output)throw new Diagnostic('Подключите delay_line: .in(сигнал), .out(сигнал).',instance.span);
  if(input.signal.kind!=='Identifier'||output.signal.kind!=='Identifier')throw new Diagnostic('Expected elaborated signal connections.',instance.span);
  if(input.signal.name===output.signal.name)throw new Diagnostic('Вход и выход delay_line должны быть разными сигналами.',instance.span);
  const expanded=elaboratePor({...instance,module:'por',connections:[output]});
  expanded.transistors[0].source=input.signal.name;expanded.transistors[0].gate=input.signal.name;
  const chain:DelayLine={...expanded.chain,input:input.signal.name};
  return {...expanded,chain,input:input.signal};
}

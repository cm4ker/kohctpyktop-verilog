import type {Netlist,Transistor} from './synthesis.ts';
/** Recover compact physical cells from connectivity, never from a module name. */
export function recognizeCells(net:Netlist):void {
 const used=new Set([...net.porChains,...net.delayLines,...net.rsTriggers].flatMap(c=>c.transistors));
 const candidates=net.transistors.filter(t=>t.type==='N'&&t.source===t.gate&&!used.has(t.id));
 const next=(t:Transistor)=>candidates.filter(n=>n.source===t.drain);
 for(const first of candidates.filter(t=>!candidates.some(p=>p.drain===t.source))){
  let t=first;const chain:Transistor[]=[];
  while(t&&!used.has(t.id)){chain.push(t);used.add(t.id);const successors=next(t);if(successors.length!==1)break;t=successors[0];}
  const c={instance:first.id,depth:chain.length,transistors:chain.map(t=>t.id),output:chain.at(-1)!.drain,permutable:false as const};
  if(first.source==='VCC')net.porChains.push(c);else net.delayLines.push({...c,input:first.source});
 }
 for(const out of new Set(net.transistors.filter(t=>t.type==='P'&&!used.has(t.id)).map(t=>t.drain))){
  const ps=net.transistors.filter(t=>t.drain===out&&t.type==='P'&&!used.has(t.id));if(ps.length!==2||ps[0].gate!==ps[1].gate)continue;
  const ns=ps.map(p=>net.transistors.find(n=>n.type==='N'&&n.source==='VCC'&&n.drain===p.source&&!used.has(n.id)));
  if(ns.some(n=>!n)||ns[0]===ns[1])continue;
  const hold=ns.findIndex(n=>n!.gate===out);if(hold<0)continue;const set=1-hold;
  const devices=[ns[set]!,ns[hold]!,ps[set],ps[hold]];
  net.rsTriggers.push({instance:out,r:ps[0].gate,s:ns[set]!.gate,output:out,transistors:devices.map(t=>t.id)});devices.forEach(t=>used.add(t.id));
 }
}
export function optimizeNets(net:Netlist):void {
 const remove=new Set<string>();
 const consumers=(name:string)=>net.transistors.filter(t=>t.gate===name||t.source===name);
 for(const group of net.seriesGroups){
  if(group.transistors.length!==2)continue;
  const devices=group.transistors.map(id=>net.transistors.find(t=>t.id===id)!);const n=devices.find(t=>t.type==='N'),p=devices.find(t=>t.type==='P');
  if(!n||!p||devices[0].source!=='VCC')continue;
  const middle=devices[0].drain;if(consumers(middle).length!==1||net.bindings.some(b=>(b.net??b.name)===middle))continue;
  p.source=n.gate;p.drain=devices[1].drain;remove.add(n.id);
 }
 for(const group of net.parallelGroups){
  const devices=group.transistors.map(id=>net.transistors.find(t=>t.id===id)!);
  if(!devices.length||devices.some(t=>remove.has(t.id)||t.type!=='N'||t.source!=='VCC'))continue;
  const gates=[...new Set(devices.map(t=>t.gate))];
  if(gates.some(g=>g===group.drain||net.bindings.some(b=>(b.net??b.name)===g)||!net.transistors.some(t=>t.drain===g)||consumers(g).some(t=>!devices.includes(t))))continue;
  for(const t of net.transistors)if(gates.includes(t.drain))t.drain=group.drain;
  devices.forEach(t=>remove.add(t.id));
 }
 net.transistors=net.transistors.filter(t=>!remove.has(t.id));
 net.seriesGroups=net.seriesGroups.filter(g=>g.transistors.every(id=>!remove.has(id)));
 net.parallelGroups=net.parallelGroups.filter(g=>g.transistors.every(id=>!remove.has(id)));
}
/** Only series-only intermediate nodes may be reassigned. Taps and gate feedback forbid it. */
export function permuteSeries(net:Netlist,attempt:number):Transistor[]{
 const result=net.transistors.map(t=>({...t}));if(!attempt)return result;
 for(const group of net.seriesGroups){
  const chain=group.transistors.map(id=>result.find(t=>t.id===id)!);if(chain.length<2||chain.some(t=>!t))continue;
  const middle=chain.slice(0,-1).map(t=>t.drain);
  if(middle.some(node=>net.bindings.some(b=>(b.net??b.name)===node)||result.some(t=>t.gate===node)||result.filter(t=>t.source===node||t.drain===node).length!==2))continue;
  const nodes=[chain[0].source,...chain.map(t=>t.drain)],order=[...chain];
  const shift=attempt%order.length;order.push(...order.splice(0,shift));if(Math.floor(attempt/order.length)%2)order.reverse();
  order.forEach((t,i)=>{t.source=nodes[i];t.drain=nodes[i+1];});
 }
 return result;
}

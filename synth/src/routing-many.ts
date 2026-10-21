import {permuteSeries} from './optimization.ts';
import {placeRsTriggers} from './library/rs-trigger-layout.ts';
import {placePorChains} from './library/por-layout.ts';
import {createBoard,connect,score} from './board.ts';
import type {Netlist,Point} from './synthesis.ts';
import type {Layout} from './routing.ts';
const W=44,N=W*27;
const pos=(p:number):Point=>[p%W,Math.floor(p%N/W)];
const id=(p:Point)=>p[0]+W*p[1];
const distance=(a:Point,b:Point)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
const neighbors=Array.from({length:2*N},(_,p)=>{const[x,y]=pos(p),r:number[]=[];if(x>1)r.push(p-1);if(x<42)r.push(p+1);if(y>0)r.push(p-W);if(y<26)r.push(p+W);r.push(p<N?p+N:p-N);return r;});
/** Multi-terminal two-layer routing. Each net owns its cells, so crossings
 * require different layers. Gate silicon is reserved and never a wire. */
export function routeMany(netlist:Netlist):Layout {
  let seed=1234567;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  const names=[...new Set(['VCC',...netlist.bindings.map(b=>b.net??b.name),...netlist.transistors.flatMap(t=>[t.source,t.gate,t.drain])])];
  const netId=new Map(names.map((name,i)=>[name,i]));
  const materials=names.map(name=>{
    let n=0,p=0;
    for(const t of netlist.transistors){
      const channel=t.type==='N'?1:2;
      for(const [net,material] of [[t.source,channel],[t.drain,channel],[t.gate,3-channel]] as const)if(net===name){if(material===1)n++;else p++;}
    }
    return n>=p?1:2;
  });
  const outputPoint=(net:string,visited=new Set<string>()):Point=>{
    if(visited.has(net))return [22,13];visited.add(net);
    const binding=netlist.bindings.find(b=>(b.net??b.name)===net);if(binding)return binding.point;
    const next=netlist.transistors.find(t=>t.source===net||t.gate===net);
    if(!next)return [22,13];
    return outputPoint(next.drain,visited);
  };
  const pads=new Int16Array(2*N).fill(-1);
  for(const left of [1,40])for(let row=0;row<6;row++){
    const number=left===1?row:9-row,owner=row===0||row===5?0:netId.get(netlist.bindings.find(b=>b.number===number)?.net??`pin${number}`)??-2;
    for(let x=left;x<left+3;x++)for(let y=2+row*4;y<=4+row*4;y++)pads[x+y*W]=owner;
  }
  let best:Layout|undefined;
  for(let attempt=0;attempt<56||(!best&&attempt<768);attempt++){
    const routedTransistors=permuteSeries(netlist,attempt<48?0:attempt-47);
    const board=createBoard(),fixed=new Int16Array(pads),types=new Uint8Array(N),terminals=names.map(()=>[] as number[]),used=new Set<number>();
    for(const binding of netlist.bindings){const net=netId.get(binding.net??binding.name);if(net!==undefined)terminals[net].push(id(binding.point));}
    const placed=placePorChains(netlist,board,fixed,types,terminals,netId);
    placed.push(...placeRsTriggers(netlist,board,fixed,types,terminals,netId));
    const preset=new Set(placed.map(p=>p.id));
    for(const t of routedTransistors){
      if(preset.has(t.id))continue;
      const input=netlist.bindings.find(b=>(b.net??b.name)===t.gate)?.point ?? (terminals[netId.get(t.gate)!].length?pos(terminals[netId.get(t.gate)!][0]):outputPoint(t.gate)),output=outputPoint(t.drain);
      const sourcePoints=t.source==='VCC'?[[2,3],[41,3],[2,23],[41,23]] as Point[]:terminals[netId.get(t.source)!].map(pos);
      let choice:{site:number;mid:Point;ports:Point[];cost:number}|undefined;
      for(let site=0;site<108;site++)if(!used.has(site))for(let rotation=0;rotation<4;rotation++){
        const mid:Point=[5+3*(site%12),1+3*Math.floor(site/12)];let offsets:Point[]=[[-1,0],[1,0],[0,-1]];
        for(let r=0;r<rotation;r++)offsets=offsets.map(([x,y])=>[-y,x]);
        const ports=offsets.map(([x,y]):Point=>[mid[0]+x,mid[1]+y]);
        if([mid,...ports].some(p=>fixed[id(p)+N]!==-1))continue;
        const spread:Point=[7+6*(placed.length%6),4+6*(Math.floor(placed.length/6)%4)];
        const cost=(attempt>=48?20*distance(mid,spread):0)+distance(ports[1],output)+distance(ports[2],input)+.3*Math.min(...(sourcePoints.length?sourcePoints:[output]).map(p=>distance(ports[0],p)))+random()*(attempt>=48?48:attempt?18:0);
        if(!choice||cost<choice.cost)choice={site,mid,ports,cost};
      }
      if(!choice)throw Error('Недостаточно места для транзисторов.');
      used.add(choice.site);const {mid,ports}=choice;placed.push({id:t.id,point:mid});
      const channel=t.type==='N'?1:2;board.silicon[mid[0]][mid[1]]=channel;fixed[id(mid)+N]=-2;
      const nets=[netId.get(t.source)!,netId.get(t.drain)!,netId.get(t.gate)!];
      ports.forEach((p,i)=>{const net=nets[i];fixed[id(p)+N]=net;terminals[net].push(id(p)+N);types[id(p)]=i===2?3-channel:channel;board.silicon[p[0]][p[1]]=types[id(p)];connect(board,p,mid,'silicon');});
      board[ports[0][1]===ports[1][1]?'gateHorizontal':'gateVertical'][mid[0]][mid[1]]=true;
    }
    // A terminal of the opposite silicon type needs a via to join this net.
    // Reserve its metal cell before routing other nets, or they can seal it off.
    for(let net=0;net<terminals.length;net++)for(const terminal of terminals[net]){
      if(attempt>=48&&terminal>=N&&types[terminal-N]!==materials[net]){
        const p=terminal-N;
        if(fixed[p]===-1||fixed[p]===net){fixed[p]=net;const [x,y]=pos(p);board.metal[x][y]=true;board.link[x][y]=true;}
      }
    }
    const occupied=new Int16Array(fixed),order=names.map((_,i)=>i),paths:{net:string;cells:Point[]}[]=[];
    // Vary net order to avoid committing the same blocking route every time.
    if(attempt)for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    let failed=false;
    for(const net of order){
      const tree=new Set<number>();for(let p=0;p<N;p++)if(pads[p]===net&&(net===0?((Math.floor(p/W)>=2&&Math.floor(p/W)<=4)||(Math.floor(p/W)>=22&&Math.floor(p/W)<=24)):tree.size===0))tree.add(p);
      if(!tree.size && terminals[net].length)tree.add(terminals[net][0]);
      for(const start of terminals[net]){
        const parents=new Int16Array(2*N).fill(-1),queue=new Int16Array(2*N);let head=0,tail=1,goal=-1;parents[start]=start;queue[0]=start;
        while(head<tail){const p=queue[head++];if(tree.has(p)){goal=p;break;}
          for(const q of neighbors[p]){
            if(p>=N&&q>=N){const a=fixed[p]>=0?types[p-N]:materials[net],b=fixed[q]>=0?types[q-N]:materials[net];if(a!==b)continue;}
            if(parents[q]!==-1||(occupied[q]!==-1&&occupied[q]!==net))continue;const x=q%W;if((x<4||x>39)&&pads[q]!==net)continue;parents[q]=p;queue[tail++]=q;}
        }
        if(goal<0){failed=true;break;}
        const path:number[]=[];for(let p=goal;;p=parents[p]){path.push(p);occupied[p]=net;tree.add(p);if(p===start)break;}
        for(const p of path){const[x,y]=pos(p);if(p<N)board.metal[x][y]=true;else board.silicon[x][y]=fixed[p]>=0?types[p-N]:materials[net];}
        for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],p=pos(a);if(Math.abs(a-b)===N)board.link[p[0]][p[1]]=true;else connect(board,p,pos(b),a<N?'metal':'silicon');}
        paths.push({net:names[net],cells:path.map(pos)});
      }
      if(failed)break;
    }
    if(!failed){const area=score(board);if(!best||area<best.area)best={board,area,transistors:placed,routes:paths};}
  }
  if(!best)throw Error('Не удалось найти разводку для этих контактов. Попробуйте другой порядок assign или другую привязку портов.');
  return best;
}

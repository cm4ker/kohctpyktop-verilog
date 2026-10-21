import {routeMany} from './routing-many.ts';
import {createBoard,connect,score} from './board.ts';
import type {Board} from './board.ts';
import {pinPoint} from './synthesis.ts';
import type {Netlist,Point} from './synthesis.ts';
export interface Layout {board:Board; area:number; transistors:{id:string;point:Point}[]; routes:{net:string;cells:Point[]}[]}
const W=44,N=W*27,id=([x,y]:Point)=>x+W*y,point=(n:number):Point=>[n%W,Math.floor(n/W)];
const padDistance=(p:Point,center:Point)=>Math.max(Math.abs(p[0]-center[0])-1,0)+Math.max(Math.abs(p[1]-center[1])-1,0);
const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
/** Deterministic one-transistor placement with disjoint BFS metal routes. */
export function route(netlist:Netlist):Layout {
  if(netlist.transistors.length!==1 || netlist.transistors[0].type!=='P'||netlist.transistors[0].source!=='VCC'||!netlist.bindings.some(b=>b.name===netlist.transistors[0].gate&&b.direction==='input')||!netlist.bindings.some(b=>b.name===netlist.transistors[0].drain&&b.direction==='output'))return routeMany(netlist);
  const t=netlist.transistors[0];
  const input=netlist.bindings.find(b=>b.name===t.gate)!,output=netlist.bindings.find(b=>b.name===t.drain)!;
  const padOwners=new Int16Array(N).fill(-1);
  for(const left of [1,40])for(let row=0;row<6;row++){
    const pin=left===1?row:9-row;
    const owner=row===0||row===5?0:pin===input.number?1:pin===output.number?2:3;
    for(let x=left;x<left+3;x++)for(let y=2+row*4;y<=4+row*4;y++)padOwners[x+W*y]=owner;
  }
  let best:Layout|undefined;
  for(let x=5;x<=38;x+=3)for(let y=1;y<=25;y+=3)for(let rotation=0;rotation<4;rotation++){
    let offsets:Point[]=[[-1,0],[1,0],[0,-1]];
    for(let r=0;r<rotation;r++)offsets=offsets.map(([a,b])=>[-b,a]);
    const [source,drain,gate]=offsets.map(([a,b]):Point=>[x+a,y+b]);
    const contacts=[source,gate,drain],contactIds=contacts.map(id);
    // Admissible lower bound: each independent net needs at least this many
    // non-pad metal cells, in addition to the four silicon cells.
    const lowerBound=4+padDistance(gate,input.point)+padDistance(drain,output.point)+Math.min(...([[2,3],[41,3],[2,23],[41,23]] as Point[]).map(p=>padDistance(source,p)));
    if(best && best.area<=lowerBound)continue;
    for(const order of permutations){
      if(best && best.area<=lowerBound)break;
      const occupied=new Int16Array(padOwners);contactIds.forEach((p,n)=>occupied[p]=n);
      const paths:Point[][]=[];
      for(const net of order){
        const start=contactIds[net],parents=new Int16Array(N).fill(-1),queue=new Int16Array(N);let head=0,tail=1,goal=-1;
        queue[0]=start;parents[start]=start;
        while(head<tail){const p=queue[head++];if(padOwners[p]===net){goal=p;break;}
          const [px,py]=point(p);
          for(const [nx,ny]of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){
            if(nx<1||nx>42||ny<0||ny>=27)continue;const q=nx+W*ny;
            if(parents[q]!==-1||(occupied[q]!==-1&&occupied[q]!==net))continue;
            if((nx<4||nx>39)&&padOwners[q]!==net)continue;
            parents[q]=p;queue[tail++]=q;
          }
        }
        if(goal<0)break;
        const path:Point[]=[];for(let p=goal;;p=parents[p]){path.push(point(p));occupied[p]=net;if(p===start)break;}paths[net]=path;
      }
      if(paths.filter(Boolean).length!==3)continue;
      const board=createBoard();board.silicon[x][y]=2;
      for(const [p,material]of [[source,2],[drain,2],[gate,1]] as const){board.silicon[p[0]][p[1]]=material;board.link[p[0]][p[1]]=true;connect(board,p,[x,y],'silicon');}
      board[source[1]===drain[1]?'gateHorizontal':'gateVertical'][x][y]=true;
      for(const path of paths){for(const [px,py]of path)board.metal[px][py]=true;for(let k=1;k<path.length;k++)connect(board,path[k-1],path[k],'metal');}
      const area=score(board);
      if(!best||area<best.area)best={board,area,transistors:[{id:t.id,point:[x,y]}],routes:paths.map((cells,n)=>({net:['VCC',t.gate,t.drain][n],cells}))};
    }
  }
  if(!best)throw Error('Не удалось развести контакты.');return best;
}
export const pinLabels=Array.from({length:8},(_,i)=>({name:`pin${i+1}`,point:pinPoint(i+1)}));

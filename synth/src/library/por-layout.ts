import type {Board} from '../board.ts';
import {connect} from '../board.ts';
import type {Netlist,Point} from '../synthesis.ts';
/** Repeats the photographed cell: N channel below, P control bridge above,
 * two vias tying each gate to that device's source. VCC only at chain start. */
export function placePorChains(netlist:Netlist,board:Board,fixed:Int16Array,types:Uint8Array,terminals:number[][],netId:Map<string,number>):{id:string;point:Point}[]{
  const W=44,N=W*27,placed:{id:string;point:Point}[]=[];let row=0;
  const transistors=new Map(netlist.transistors.map(t=>[t.id,t]));
  function mark(p:Point,net:number,material:number){const[x,y]=p,index=x+W*y+N;fixed[index]=net;types[index-N]=material;board.silicon[x][y]=material;terminals[net].push(index);}
  for(const chain of [...netlist.porChains,...netlist.delayLines]){
    for(let i=0;i<chain.depth;i++){
      const column=i%16;if(i&&column===0)row++;
      const x=4+2*column,y=3+4*row;
      if(y>=27)throw Error('Линии POR не помещаются на поле. Уменьшите DEPTH или число экземпляров.');
      const t=transistors.get(chain.transistors[i])!,source=netId.get(t.source)!,drain=netId.get(t.drain)!;
      const a:Point=[x,y],mid:Point=[x+1,y],b:Point=[x+2,y],tap:Point=[x,y-1],control:Point=[x+1,y-1];
      mark(a,source,1);mark(b,drain,1);mark(tap,source,2);mark(control,source,2);
      board.silicon[mid[0]][mid[1]]=1;fixed[mid[0]+W*mid[1]+N]=-2;types[mid[0]+W*mid[1]]=1;board.gateHorizontal[mid[0]][mid[1]]=true;
      connect(board,a,mid,'silicon');connect(board,mid,b,'silicon');connect(board,tap,control,'silicon');connect(board,control,mid,'silicon');
      for(const p of [a,tap]){board.metal[p[0]][p[1]]=true;board.link[p[0]][p[1]]=true;fixed[p[0]+W*p[1]]=source;}
      connect(board,a,tap,'metal');placed.push({id:t.id,point:mid});
    }
    row++;
  }
  return placed;
}

import type {Board} from '../board.ts';
import {connect} from '../board.ts';
import type {Netlist,Point} from '../synthesis.ts';

/** Four-transistor cell: two independent N/P branches with common R and Q. */
export function placeRsTriggers(netlist:Netlist,board:Board,fixed:Int16Array,types:Uint8Array,terminals:number[][],netId:Map<string,number>):{id:string;point:Point}[]{
  const W=44,N=W*27,placed:{id:string;point:Point}[]=[];
  const devices=new Map(netlist.transistors.map(t=>[t.id,t]));
  for(const latch of netlist.rsTriggers){
    let origin:Point|undefined;
    for(let y=3;y<=20&&!origin;y+=8)for(let x=7;x<=35&&!origin;x+=7){
      let free=true;
      for(let xx=x-1;xx<=x+4;xx++)for(let yy=y-1;yy<=y+6;yy++)if(fixed[xx+W*yy+N]!==-1||fixed[xx+W*yy]!==-1)free=false;
      if(free)origin=[x,y];
    }
    if(!origin)throw Error('No room for rs_trigger cells.');
    const at=(x:number,y:number):Point=>[origin![0]+x,origin![1]+y];
    const mark=(x:number,y:number,net:string,material:number)=>{
      const p=at(x,y),i=p[0]+W*p[1],n=netId.get(net)!;
      fixed[i+N]=n;types[i]=material;board.silicon[p[0]][p[1]]=material;terminals[n].push(i+N);
    };
    const edge=(a:Point,b:Point,layer:'silicon'|'metal'='silicon')=>connect(board,at(...a),at(...b),layer);
    const via=(x:number,y:number,net:string)=>{
      const p=at(x,y),i=p[0]+W*p[1];fixed[i]=netId.get(net)!;board.metal[p[0]][p[1]]=true;board.link[p[0]][p[1]]=true;
    };
    const gate=(device:string,x:number,y:number,material:number)=>{
      const p=at(x,y),i=p[0]+W*p[1];fixed[i+N]=-2;types[i]=material;board.silicon[p[0]][p[1]]=material;
      board.gateVertical[p[0]][p[1]]=true;placed.push({id:device,point:p});
    };
    const [sn,hn,sp,hp]=latch.transistors.map(id=>devices.get(id)!);
    mark(1,0,'VCC',1);mark(2,0,'VCC',1);edge([1,0],[2,0]);via(1,0,'VCC');
    gate(sn.id,1,1,1);gate(hn.id,2,1,1);
    mark(0,1,latch.s,2);mark(3,1,latch.output,2);via(0,1,latch.s);
    mark(1,2,sn.drain,1);mark(2,2,hn.drain,1);
    for(const x of [1,2]){edge([x,0],[x,1]);edge([x,1],[x,2]);}
    edge([0,1],[1,1]);edge([3,1],[2,1]);
    mark(0,3,sp.source,2);mark(2,3,hp.source,2);
    via(1,2,sp.source);via(0,3,sp.source);via(2,2,hp.source);via(2,3,hp.source);
    const bend=at(1,3);fixed[bend[0]+W*bend[1]]=netId.get(sp.source)!;board.metal[bend[0]][bend[1]]=true;
    edge([1,2],[1,3],'metal');edge([1,3],[0,3],'metal');edge([2,2],[2,3],'metal');
    gate(sp.id,0,4,2);gate(hp.id,2,4,2);mark(1,4,latch.r,1);via(1,4,latch.r);
    edge([1,4],[0,4]);edge([1,4],[2,4]);
    for(let x=0;x<=3;x++)mark(x,5,latch.output,2);
    for(let x=0;x<3;x++)edge([x,5],[x+1,5]);
    for(let y=2;y<=4;y++)mark(3,y,latch.output,2);
    for(let y=1;y<5;y++)edge([3,y],[3,y+1]);
    for(const x of [0,2]){edge([x,3],[x,4]);edge([x,4],[x,5]);}
    via(0,5,latch.output);
  }
  return placed;
}

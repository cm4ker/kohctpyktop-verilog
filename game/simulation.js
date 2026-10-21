// Timing and grading ported from SimulationState and Graph.
export function expand(blocks,output=false){return blocks.flatMap(v=>Array.from({length:10},(_,t)=>v===0?false:v===1?true:output&&v===3?t>=2&&t<7:t<5));}
export function matches(values,pattern){
  let correct=0,counted=0;
  for(let t=2;t<values.length-2;t++)if([t-2,t-1,t+1,t+2].every(i=>pattern[i]===pattern[t])){counted++;if(values[t]===pattern[t])correct++;}
  return counted?Math.trunc(correct*100/counted):0;
}
export const pad=i=>[i<4?2:41,7+(i%4)*4];
export class Simulation {
  constructor(canvas,level){this.canvas=canvas;this.level=level;this.signals=level.pins.map(p=>({...p,pattern:expand(p.blocks,p.output),values:[]}));this.reset();}
  reset(){this.time=0;this.done=false;this.rate=null;this.signals.forEach(s=>s.values=[]);this.canvas.AddConnectionPads();this.canvas.SimClearHot();this.canvas.SimClearGates();this.canvas.SimCacheGates();}
  step(){
    if(this.done)return;const c=this.canvas;c.SimClearHot();
    this.signals.forEach((s,i)=>{if(!s.output&&s.pattern[this.time])c.SimSetHot(...pad(i),true);});
    for(const [x,y] of [[2,3],[2,23],[41,3],[41,23]])c.SimSetHot(x,y,true);
    this.signals.forEach((s,i)=>{const [x,y]=pad(i);s.values.push(!!c.metalHot[x][y]);});
    c.SimClearGates();c.SimCacheGates();this.time++;
    if(this.time>=this.level.length){this.done=true;const outputs=this.signals.filter(s=>s.output);this.rate=outputs.reduce((sum,s)=>sum+matches(s.values,s.pattern),0)/outputs.length;}
  }
  run(){while(!this.done)this.step();return this.rate;}
}

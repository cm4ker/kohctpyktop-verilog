import {Canvas} from '../game/canvas.js';
import {Editor} from '../game/editor.js';
export function blank(){const c=new Canvas(44,27);c.mainCanvasLock=true;c.AddConnectionPads();return c;}
export function line(e,tool,alternate,points){e.tool=tool;e.alternate=alternate;let p={x:points[0][0],y:points[0][1]};e.paint(p,p);for(const [x,y] of points.slice(1)){while(p.x!==x||p.y!==y){const q={...p};if(q.x!==x)q.x+=Math.sign(x-q.x);else q.y+=Math.sign(y-q.y);e.paint(q,p);p=q;}}}
export function quadInverter(){const c=blank(),e=new Editor(c);line(e,1,false,[[3,3],[10,3],[10,19]]);
  for(const y of [7,11,15,19]){
    line(e,0,true,[[12,y],[20,y]]);
    line(e,0,false,[[6,y-1],[16,y-1],[16,y]]);
    line(e,1,false,[[3,y],[6,y],[6,y-1]]);
    line(e,1,false,[[10,y],[12,y]]);
    line(e,1,false,[[20,y],[40,y]]);
    for(const [x,yy] of [[6,y-1],[12,y],[20,y]])line(e,2,false,[[x,yy]]);
  }return c;
}

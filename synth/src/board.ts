export const booleanFields = ['metal','gateHorizontal','gateVertical','link','siliconConnectedRight','siliconConnectedDown','metalConnectedRight','metalConnectedDown'] as const;
export type BooleanField = typeof booleanFields[number];
export type Board = {format:'kohctpyktop-js';version:1;width:44;height:27;silicon:number[][]} & Record<BooleanField,boolean[][]>;
export function createBoard(): Board {
  const board = {format:'kohctpyktop-js',version:1,width:44,height:27,silicon:Array.from({length:44},()=>Array<number>(27).fill(0))} as Board;
  for (const field of booleanFields) board[field] = Array.from({length:44},()=>Array<boolean>(27).fill(false));
  for (const left of [1,40]) for (let row=0;row<6;row++) for (let x=left;x<left+3;x++) for(let y=2+row*4;y<=4+row*4;y++) {
    board.metal[x][y]=true;
    if(x<left+2) board.metalConnectedRight[x][y]=true;
    if(y<4+row*4) board.metalConnectedDown[x][y]=true;
  }
  return board;
}
export function score(board:Board):number { return board.silicon.flat().filter(Boolean).length + board.metal.flat().filter(Boolean).length - 108; }
export function connect(board:Board, a:readonly number[], b:readonly number[], layer:'metal'|'silicon'):void {
  const [x,y]=a,[xx,yy]=b;
  if(Math.abs(x-xx)+Math.abs(y-yy)!==1) throw Error('Соединение должно быть между соседними клетками.');
  if(y===yy) board[`${layer}ConnectedRight`][Math.min(x,xx)][y]=true;
  else board[`${layer}ConnectedDown`][x][Math.min(y,yy)]=true;
}
export function encode(board:Board):string { return JSON.stringify(board); }
export async function exportLegacy(board:Board):Promise<string> {
  const bytes:number[]=[];
  const u29=(n:number)=>{if(n<128)bytes.push(n);else bytes.push((n>>7)|128,n&127);};
  function value(v:number|boolean|unknown[]):void {
    if(typeof v==='boolean') bytes.push(v?3:2);
    else if(typeof v==='number'){bytes.push(4);u29(v);}
    else {bytes.push(9);u29(v.length*2+1);bytes.push(1);for(const item of v)value(item as number|boolean|unknown[]);}
  }
  const fields=['silicon',...booleanFields] as const;
  [board.width,board.height,...fields.map(k=>board[k])].forEach(value);
  const data=await new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(data)));
}

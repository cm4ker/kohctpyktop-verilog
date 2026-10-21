import {Canvas} from './canvas.js';
export const fields=['silicon','metal','gateHorizontal','gateVertical','link','siliconConnectedRight','siliconConnectedDown','metalConnectedRight','metalConnectedDown'];
export function encode(c){return JSON.stringify({format:'kohctpyktop-js',version:1,width:c.width,height:c.height,...Object.fromEntries(fields.map(k=>[k,c[k]]))});}
export function decode(text){
  const data=typeof text==='string'?JSON.parse(text):text;
  if(!data||!Number.isInteger(data.width)||!Number.isInteger(data.height)||data.width<1||data.width>44||data.height<1||data.height>27)throw Error('Неверный размер схемы');
  const c=new Canvas(data.width,data.height);
  for(const k of fields){
    const a=data[k];if(!Array.isArray(a)||a.length!==c.width||a.some(col=>!Array.isArray(col)||col.length!==c.height))throw Error('Повреждён слой '+k);
    c[k]=a.map(col=>col.map(v=>{if(k==='silicon'){if(![0,1,2].includes(v))throw Error('Неверный тип кремния');return v;}if(![true,false,0,1].includes(v))throw Error('Неверное значение слоя');return !!v;}));
  }
  // Reject malformed imported topology before the recursive propagation engine sees it.
  for(let x=0;x<c.width;x++)for(let y=0;y<c.height;y++){
    for(const layer of ['metal','silicon']){
      for(const [suffix,dx,dy] of [['Right',1,0],['Down',0,1]])if(c[layer+'Connected'+suffix][x][y]&&(!c[layer][x][y]||x+dx>=c.width||y+dy>=c.height||!c[layer][x+dx][y+dy]))throw Error('Соединение без проводника');
    }
    if(c.link[x][y]&&!c.silicon[x][y])throw Error('Контакт без кремния');
  }
  c.InvalidateBadGates();return c;
}
// Flash ByteArray.writeObject uses AMF3, then zlib and Base64 (Canvas.Serialize).
// Each writeObject has its own reference tables. Only the types present in designs are accepted.
export async function importLegacy(text){
  const packed=Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0));
  if(packed.length>100000)throw Error('Файл слишком большой');
  const reader=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const parts=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>200000)throw Error('Файл слишком большой');parts.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
  let pos=0;
  const byte=()=>{if(pos>=bytes.length)throw Error('Оборванный AMF');return bytes[pos++];};
  function u29(){let n=0;for(let i=0;i<3;i++){const b=byte();if(b<128)return(n<<7)|b;n=(n<<7)|(b&127);}return(n<<8)|byte();}
  function object(){const refs=[];function value(depth=0){
    if(depth>4)throw Error('Слишком глубокий AMF');
    const type=byte();if(type===2)return false;if(type===3)return true;
    if(type===4){const n=u29();return n&0x10000000?n-0x20000000:n;}
    if(type===5){if(pos+8>bytes.length)throw Error('Оборванный AMF');const n=new DataView(bytes.buffer).getFloat64(pos);pos+=8;return n;}
    if(type===9){const header=u29();if(!(header&1)){const a=refs[header>>1];if(!a)throw Error('Неверная ссылка AMF');return a;}const length=header>>1;if(length>44||byte()!==1)throw Error('Неверный массив AMF');const a=[];refs.push(a);for(let i=0;i<length;i++)a.push(value(depth+1));return a;}
    throw Error('Неподдерживаемый тип AMF: '+type);
  }return value();}
  const data={width:object(),height:object()};for(const k of fields)data[k]=object();
  if(pos!==bytes.length)throw Error('Лишние данные AMF');return decode(data);
}
export async function exportLegacy(c){
  const bytes=[];
  function u29(n){if(n<128)bytes.push(n);else if(n<16384)bytes.push((n>>7)|128,n&127);else throw Error('AMF integer out of range');}
  function value(v){if(typeof v==='boolean'){bytes.push(v?3:2);}else if(typeof v==='number'){bytes.push(4);u29(v);}else{bytes.push(9);u29(v.length*2+1);bytes.push(1);v.forEach(value);}}
  [c.width,c.height,...fields.map(k=>c[k])].forEach(value);
  const compressed=await new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(compressed)));
}

export interface LevelInfo {id:string;title:string;pins:{name:string;output:boolean}[]}
export function moduleTemplate(level:LevelInfo):string {
  const pins=level.pins.map((p,i)=>({...p,number:i<4?i+1:12-i})).filter(p=>p.name!=='N/C').sort((a,b)=>a.number-b.number);
  return `// ${level.id}: ${level.title}\nmodule root (\n`+pins.map((p,i)=>`    ${p.output?'output':'input '} pin${p.number}${i<pins.length-1?',':' '} // ${p.name}; ${p.number<=4?'слева':'справа'}`).join('\n')+'\n);\n    // Ваша схема\nendmodule\n';
}

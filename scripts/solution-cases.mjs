export function solutionCases(text){
 const result=[];let level=1,lines=[],start=1;
 const flush=()=>{if(lines.some(l=>/^\s*module\s+root\b/.test(l)))result.push({level,line:start,source:lines.join('\n')});lines=[];};
 text.replace(/^\uFEFF/,'').split(/\r?\n/).forEach((line,i)=>{
  const marker=line.match(/^\s*-{2,}\s*(\d+)?\s*$/);
  if(marker){flush();level=marker[1]?Number(marker[1]):level+1;start=i+2;return;}
  if(/^\s*module\s+root\b/.test(line)){flush();start=i+1;}
  lines.push(line);
 });flush();
 const counters=new Map();return result.map((c,i)=>({...c,variant:(counters.set(c.level,(counters.get(c.level)??0)+1),counters.get(c.level)),required:!result.slice(i+1).some(next=>next.level===c.level)}));
}
